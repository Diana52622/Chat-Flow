import { Request, Response } from 'express';
import { listFlights } from '../services/flightService';
import { sendToDialogflow, DialogflowResponse } from '../services/dialogflowService';

interface DialogflowContext {
  name: string;
  lifespanCount?: number;
  parameters?: {
    fields: {
      // City parameters
      'city-from'?: { stringValue: string };
      'city-to'?: { stringValue: string };
      'city-from.original'?: { stringValue: string };
      'city-to.original'?: { stringValue: string };
      // Date parameters
      'date'?: { stringValue: string };
      'date-time'?: { stringValue: string };
      'date.original'?: { stringValue: string };
      // Transport parameters
      'transport_type'?: { stringValue: string };
      'transport-type'?: { stringValue: string };
      'transport_type.original'?: { stringValue: string };
      // Passenger parameters
      'passengers'?: { numberValue: number };
      'passenger-count'?: { numberValue: number };
      'passengers.original'?: { stringValue: string };
      // Other parameters
      [key: string]: { stringValue?: string; numberValue?: number; boolValue?: boolean } | undefined;
    };
  };
}

interface DialogflowWebhookRequest {
  queryResult: {
    intent: {
      displayName: string;
      isFallback: boolean;
    };
    parameters: {
      fields: {
        [key: string]: { stringValue?: string; numberValue?: number; boolValue?: boolean } | undefined;
      };
    };
    fulfillmentText: string;
    allRequiredParamsPresent: boolean;
    outputContexts: DialogflowContext[];
  };
  session: string;
  responseId: string;
}

interface FlightResponse {
  id: number;
  flight_number: string;
  departure_city: string;
  arrival_city: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  available_seats: number;
  status: string;
  transport_type: string;
}

// Глобальная переменная для хранения параметров поиска между запросами
const searchParamsCache = new Map<string, any>();

export const handleDialogflowWebhook = async (req: Request, res: Response) => {
  try {
    // Получаем ID сессии
    const sessionId = req.body.session.split('/').pop() || 'default-session';
    console.log('Обработка запроса для сессии:', sessionId);
    console.log('Received webhook request:', JSON.stringify(req.body, null, 2));
    
    // Validate request body
    if (!req.body || !req.body.queryResult) {
      console.error('Invalid request body:', req.body);
      return res.status(400).json({
        fulfillmentText: 'Ошибка: неверный формат запроса'
      });
    }
    
    const { queryResult, session } = req.body as any; // Temporary any type to bypass type checking
    
    // Forward the request to Dialogflow
    try {
      // Get the message text and normalize it
      const messageText = req.body.queryResult?.queryText || '';
      const normalizedMessage = messageText.toLowerCase().trim();
      
      // Log the request
      console.log('Processing message:', messageText);
      
      // Get and clean up the session ID
      let cleanSessionId = req.body.session;
      // Extract just the session ID if it's a full path
      const sessionMatch = cleanSessionId.match(/sessions\/([^/]+)$/);
      if (sessionMatch) {
        cleanSessionId = sessionMatch[1];
      } else if (session?.includes('sessions/')) {
        // Fallback to the session from the request if available
        cleanSessionId = session.split('/').pop() || `session-${Date.now()}`;
      }
      
      console.log('Using session ID:', cleanSessionId);
      
      // Forward the request to Dialogflow
      const dialogflowResponse = await sendToDialogflow(messageText, cleanSessionId);
      
      // Log the response from Dialogflow
      console.log('Dialogflow response:', JSON.stringify(dialogflowResponse, null, 2));
      
      // Проверяем, является ли это подтверждением
      const isConfirmation = 
        (dialogflowResponse.queryResult.intent.isFallback || 
         dialogflowResponse.queryResult.intent.displayName === 'Confirmation.Yes') && 
        ['да', 'верно', 'подтверждаю', 'всё верно', 'ок', 'согласен'].includes(normalizedMessage);
      

      console.log('Confirmation check:', {
        messageText: messageText,
        intent: dialogflowResponse.queryResult.intent.displayName,
        isConfirmation
      });
      
      // Если это запрос на поиск, сохраняем параметры в кеш
      if (dialogflowResponse.queryResult.intent.displayName === 'SearchFlights') {
        // Extract parameters from the current request
        const params = dialogflowResponse.queryResult.parameters?.fields || {};
        console.log('Параметры из текущего запроса:', JSON.stringify(params, null, 2));

        // Extract cities from parameters with multiple possible keys
        const fromCity = params['city-from']?.stringValue || 
                        params['from-city']?.stringValue ||
                        (params['city-from.original']?.stringValue || '').replace('из ', '').trim();
                        
        const toCity = params['city-to']?.stringValue || 
                      params['to-city']?.stringValue ||
                      (params['city-to.original']?.stringValue || '').trim();

        // Extract other parameters with fallbacks
        const date = params['date']?.stringValue || 
                    params['date-time']?.stringValue ||
                    params['departure-date']?.stringValue;

        const transportType = params['transport_type']?.stringValue || 
                            params['transport-type']?.stringValue ||
                            (params['transport_type.original']?.stringValue || '').replace('на ', '').trim();

        const passengers = params['passengers']?.numberValue || 
                          params['passenger-count']?.numberValue || 
                          parseInt(params['passengers.original']?.stringValue || '1', 10) || 1;

        console.log('Извлеченные параметры:', {
          fromCity,
          toCity,
          date,
          transportType,
          passengers
        });

        const searchParams = {
          'from-city': fromCity,
          'to-city': toCity,
          'date-time': date,
          'transport-type': transportType,
          'passenger-count': passengers
        };
        searchParamsCache.set(sessionId, searchParams);
        console.log('Сохранены параметры поиска:', searchParams);
      }
      
      if (isConfirmation) {
        console.log('=== CONFIRMATION FLOW ===');
        
        // Пытаемся получить параметры из разных источников
        const outputContexts = dialogflowResponse.queryResult.outputContexts || [];
        let currentParams = { ...(dialogflowResponse.queryResult.parameters?.fields || {}) };
        
        // 1. Пробуем получить параметры из кеша
        const cachedParams = searchParamsCache.get(sessionId);
        if (cachedParams) {
          console.log('Найдены параметры в кеше:', cachedParams);
          // Конвертируем обычный объект в формат Dialogflow
          Object.entries(cachedParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              currentParams[key] = typeof value === 'number' 
                ? { numberValue: value }
                : { stringValue: String(value) };
            }
          });
        }
        
        // 2. Пробуем получить параметры из контекстов
        const confirmationContext = outputContexts.find(ctx => 
          ctx.name.includes('awaiting_confirmation')
        );
        
        if (confirmationContext?.parameters?.fields) {
          console.log('Найден контекст подтверждения с параметрами:', 
            JSON.stringify(confirmationContext.parameters.fields, null, 2));
          Object.assign(currentParams, confirmationContext.parameters.fields);
        }
        
        console.log('Текущий интент:', dialogflowResponse.queryResult.intent.displayName);
        console.log('Все контексты:', outputContexts.map(ctx => ({
          name: ctx.name.split('/').pop(),
          hasParams: !!ctx.parameters?.fields && Object.keys(ctx.parameters.fields).length > 0
        })));
        
        // Ищем параметры во всех возможных контекстах
        let allParams: any = {};
        
        // 1. Проверяем текущие параметры
        if (Object.keys(currentParams).length > 0) {
          console.log('Найдены параметры в текущем запросе:', currentParams);
          allParams = { ...allParams, ...currentParams };
        }
        
        // 2. Проверяем все контексты
        outputContexts.forEach((ctx, index) => {
          if (ctx.parameters?.fields && Object.keys(ctx.parameters.fields).length > 0) {
            console.log(`Параметры из контекста ${ctx.name.split('/').pop()}:`, ctx.parameters.fields);
            allParams = { ...allParams, ...ctx.parameters.fields };
          }
        });
        
        console.log('Все найденные параметры:', JSON.stringify(allParams, null, 2));
        
        // Извлекаем города из всех возможных полей
        const fromCity = allParams['city-from']?.stringValue || 
                        allParams['from-city']?.stringValue ||
                        (allParams['city-from.original']?.stringValue || '').replace('из ', '').trim();
                        
        const toCity = allParams['city-to']?.stringValue || 
                      allParams['to-city']?.stringValue ||
                      (allParams['city-to.original']?.stringValue || '').trim();
                      
        // Логируем значения для отладки
        console.log('Попытка извлечения городов:', {
          'city-from': allParams['city-from']?.stringValue,
          'from-city': allParams['from-city']?.stringValue,
          'city-from.original': allParams['city-from.original']?.stringValue,
          'city-to': allParams['city-to']?.stringValue,
          'to-city': allParams['to-city']?.stringValue,
          'city-to.original': allParams['city-to.original']?.stringValue,
          result: { fromCity, toCity }
        });
                      
        // Логируем все доступные параметры для отладки
        console.log('Все доступные параметры:', Object.entries(allParams)
          .filter(([_, v]) => {
            const value = v as { stringValue?: string; numberValue?: number; boolValue?: boolean };
            return value?.stringValue || value?.numberValue || value?.boolValue;
          })
          .map(([k, v]) => {
            const value = v as { stringValue?: string; numberValue?: number; boolValue?: boolean };
            return `${k}: ${value.stringValue || value.numberValue || value.boolValue}`;
          })
          .join(', '));
        
        console.log('Извлеченные города:', { fromCity, toCity });
        
        if (!fromCity) {
          console.error('Не удалось определить город отправления');
          return res.json({
            fulfillmentText: 'Извините, я не смог найти информацию о городе отправления. Пожалуйста, начните поиск заново, указав города отправления и назначения.'
          });
        }
        
        if (!toCity) {
          console.error('Не удалось определить город назначения');
          return res.json({
            fulfillmentText: 'Извините, я не смог найти информацию о городе назначения. Пожалуйста, начните поиск заново, указав города отправления и назначения.'
          });
        }
        
        // Продолжаем с извлеченными параметрами
        const date = allParams['date-time']?.stringValue || allParams['departure-date']?.stringValue || '';
        const transportType = allParams['transport-type']?.stringValue || '';
        const passengers = parseInt(allParams['passenger-count']?.numberValue?.toString() || '1');
        
        const searchParams = {
          fromCity: fromCity.trim(),
          toCity: toCity.trim(),
          date: date.split('T')[0],
          transportType: transportType.toLowerCase(),
          passengers: isNaN(passengers) ? 1 : passengers
        };
        
        console.log('Параметры для поиска рейсов:', searchParams);
        
        try {
          // Build search filters
          const filters: any = {};
          
          if (searchParams.fromCity) {
            filters.departure_city = searchParams.fromCity;
          }
          
          if (searchParams.toCity) {
            filters.arrival_city = searchParams.toCity;
          }
          
          if (searchParams.date) {
            filters.departure_date = searchParams.date;
          }
          
          if (searchParams.passengers) {
            filters.min_seats = searchParams.passengers;
          }
          
          if (searchParams.transportType) {
            filters.transport_type = searchParams.transportType;
          }
          
          console.log('Поиск рейсов с фильтрами:', JSON.stringify(filters, null, 2));
          
          // Search for matching flights
          const flights = await listFlights(filters);
          
          console.log('Найдено рейсов:', flights.length);
          
          console.log('=== FLIGHT SEARCH RESULTS ===');
          console.log(`Found ${flights.length} matching flights`);
          
          if (flights.length > 0) {
            console.log('Sample flight data:');
            console.log(JSON.stringify(flights[0], null, 2));
            console.log('===========================');
            // Format the flights for the response
            const formattedFlights = flights.map(flight => ({
              id: flight.id,
              number: flight.flight_number,
              departure_city: flight.departure_city,
              arrival_city: flight.arrival_city,
              departure_time: flight.departure_time,
              arrival_time: flight.arrival_time,
              price: flight.price,
              available_seats: flight.available_seats,
              status: flight.status,
              type: flight.transport_type
            }));
            
            // Return the flights in the response
            return res.json({
              fulfillmentText: `Нашёл ${flights.length} подходящих рейсов. Вот они:`, 
              flights: formattedFlights
            });
          } else {
            return res.json({
              fulfillmentText: 'К сожалению, по вашему запросу рейсы не найдены. Хотите изменить параметры поиска?'
            });
          }
        } catch (error) {
          console.error('Error searching for flights:', error);
          return res.json({
            fulfillmentText: 'Произошла ошибка при поиске рейсов. Пожалуйста, попробуйте ещё раз.'
          });
        }
      }
      
      // Return the Dialogflow response for all other cases
      return res.json(dialogflowResponse);
    } catch (error) {
      console.error('Error forwarding to Dialogflow:', error);
      return res.status(500).json({
        fulfillmentText: 'Произошла ошибка при обработке запроса. Пожалуйста, попробуйте еще раз.'
      });
    }
    
    // No additional processing needed - all responses come from Dialogflow
    // This is just a fallback in case something goes wrong
    return res.status(500).json({
      fulfillmentText: 'Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте еще раз.'
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({
      fulfillmentText: 'Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте еще раз.'
    });
  }
}
