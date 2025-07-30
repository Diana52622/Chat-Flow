import { Request, Response } from 'express';
import { listFlights } from '../services/flightService';
import { sendToDialogflow } from '../services/dialogflowService';

const searchParamsCache = new Map<string, any>();

export const handleDialogflowWebhook = async (req: Request, res: Response) => {
  try {
    const sessionId = req.body.session.split('/').pop() || 'default-session';
    console.log('Обработка запроса для сессии:', sessionId);
    console.log('Received webhook request:', JSON.stringify(req.body, null, 2));
    
    if (!req.body || !req.body.queryResult) {
      console.error('Invalid request body:', req.body);
      return res.status(400).json({
        fulfillmentText: 'Ошибка: неверный формат запроса'
      });
    }
    
    const { session } = req.body as any;
    
    try {
      const messageText = req.body.queryResult?.queryText || '';
      const normalizedMessage = messageText.toLowerCase().trim();
      
      console.log('Processing message:', messageText);
      
      let cleanSessionId = req.body.session;
      const sessionMatch = cleanSessionId.match(/sessions\/([^/]+)$/);
      if (sessionMatch) {
        cleanSessionId = sessionMatch[1];
      } else if (session?.includes('sessions/')) {
        cleanSessionId = session.split('/').pop() || `session-${Date.now()}`;
      }
      
      console.log('Using session ID:', cleanSessionId);
      
      const dialogflowResponse = await sendToDialogflow(messageText, cleanSessionId);
      
      console.log('Dialogflow response:', JSON.stringify(dialogflowResponse, null, 2));
      
      const isConfirmation = 
        (dialogflowResponse.queryResult.intent.isFallback || 
         dialogflowResponse.queryResult.intent.displayName === 'Confirmation.Yes') && 
        ['да', 'верно', 'подтверждаю', 'всё верно', 'ок', 'согласен'].includes(normalizedMessage);
      

      console.log('Confirmation check:', {
        messageText: messageText,
        intent: dialogflowResponse.queryResult.intent.displayName,
        isConfirmation
      });
      
      if (dialogflowResponse.queryResult.intent.displayName === 'SearchFlights') {
        const params = dialogflowResponse.queryResult.parameters?.fields || {};
        console.log('Параметры из текущего запроса:', JSON.stringify(params, null, 2));

        const fromCity = params['city-from']?.stringValue || 
                        params['from-city']?.stringValue ||
                        (params['city-from.original']?.stringValue || '').replace('из ', '').trim();
                        
        const toCity = params['city-to']?.stringValue || 
                      params['to-city']?.stringValue ||
                      (params['city-to.original']?.stringValue || '').trim();

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
        
        const outputContexts = dialogflowResponse.queryResult.outputContexts || [];
        let currentParams = { ...(dialogflowResponse.queryResult.parameters?.fields || {}) };
        
        const cachedParams = searchParamsCache.get(sessionId);
        if (cachedParams) {
          console.log('Найдены параметры в кеше:', cachedParams);
          Object.entries(cachedParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              currentParams[key] = typeof value === 'number' 
                ? { numberValue: value }
                : { stringValue: String(value) };
            }
          });
        }
        
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
        
        let allParams: any = {};
        
        if (Object.keys(currentParams).length > 0) {
          console.log('Найдены параметры в текущем запросе:', currentParams);
          allParams = { ...allParams, ...currentParams };
        }
        
        outputContexts.forEach((ctx, index) => {
          if (ctx.parameters?.fields && Object.keys(ctx.parameters.fields).length > 0) {
            console.log(`Параметры из контекста ${ctx.name.split('/').pop()}:`, ctx.parameters.fields);
            allParams = { ...allParams, ...ctx.parameters.fields };
          }
        });
        
        console.log('Все найденные параметры:', JSON.stringify(allParams, null, 2));
        
        const fromCity = allParams['city-from']?.stringValue || 
                        allParams['from-city']?.stringValue ||
                        (allParams['city-from.original']?.stringValue || '').replace('из ', '').trim();
                        
        const toCity = allParams['city-to']?.stringValue || 
                      allParams['to-city']?.stringValue ||
                      (allParams['city-to.original']?.stringValue || '').trim();
                      
        console.log('Попытка извлечения городов:', {
          'city-from': allParams['city-from']?.stringValue,
          'from-city': allParams['from-city']?.stringValue,
          'city-from.original': allParams['city-from.original']?.stringValue,
          'city-to': allParams['city-to']?.stringValue,
          'to-city': allParams['to-city']?.stringValue,
          'city-to.original': allParams['city-to.original']?.stringValue,
          result: { fromCity, toCity }
        });
                      
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
          
          const flights = await listFlights(filters);
          
          console.log('Найдено рейсов:', flights.length);
          
          console.log('=== FLIGHT SEARCH RESULTS ===');
          console.log(`Found ${flights.length} matching flights`);
          
          if (flights.length > 0) {
            console.log('Sample flight data:');
            console.log(JSON.stringify(flights[0], null, 2));
            console.log('===========================');
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
      
      return res.json(dialogflowResponse);
    } catch (error) {
      console.error('Error forwarding to Dialogflow:', error);
      return res.status(500).json({
        fulfillmentText: 'Произошла ошибка при обработке запроса. Пожалуйста, попробуйте еще раз.'
      });
    }
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({
      fulfillmentText: 'Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте еще раз.'
    });
  }
}
