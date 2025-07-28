"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./Chat.module.css";

interface BaseMessage {
  from: 'user' | 'bot';
  text: string;
}

interface TextMessage extends BaseMessage {
  type: 'message';
}

interface FlightMessage extends BaseMessage {
  type: 'flight';
  data: Trip[];
  hasMore: boolean;
  loadingMore: boolean;
}

interface FlightsMessage extends Omit<BaseMessage, 'text'> {
  type: 'flights';
  flights: Trip[];
  showMore: boolean;
  text?: string; // Make text optional for FlightsMessage
}

type Message = TextMessage | FlightMessage | FlightsMessage;

// Типы транспорта
type TransportType = 'airplane' | 'train' | 'bus';

// Базовый интерфейс для поездки
interface TripBase {
  id: number;
  number: string;
  departure_city: string;
  arrival_city: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  available_seats: number;
  status: string;
  type: TransportType;
}

// Интерфейсы для конкретных типов транспорта
interface AirplaneTrip extends TripBase {
  type: 'airplane';
  gate?: string;
  terminal?: string;
  baggage_allowance: string;
}

interface TrainTrip extends TripBase {
  type: 'train';
  train_type: string;
  carriage_type: 'platzkart' | 'coupe' | 'luxury';
  car_number: string;
}

interface BusTrip extends TripBase {
  type: 'bus';
  bus_type: 'standard' | 'comfort' | 'business';
  amenities: string[];
}

// Общий тип для поездки
type Trip = AirplaneTrip | TrainTrip | BusTrip;

// Старый интерфейс Flight был удалён, так как мы используем новый тип Trip

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  // We'll keep track of selected flight for the booking flow
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Шаблоны подсказок
  const suggestionTemplates = [
    'Хочу поехать',
    'Забронировать билет',
    'Купить билет'
  ];


  
  // Функция для загрузки дополнительных рейсов
  const loadMoreTrips = useCallback((allTrips: Trip[], page: number) => {
    const endIndex = page; // Show one more trip with each click
    const hasMoreTrips = endIndex < allTrips.length;
    
    setCurrentPage(page);
    setHasMore(hasMoreTrips);
    
    // Update the flights message
    setMessages(prev => {
      const flightMessageIndex = prev.findIndex((msg): msg is FlightMessage => msg.type === 'flight');
      if (flightMessageIndex !== -1) {
        const updatedMessages = [...prev];
        const flightMessage = updatedMessages[flightMessageIndex] as FlightMessage;
        updatedMessages[flightMessageIndex] = {
          ...flightMessage,
          data: allTrips.slice(0, endIndex), // Show all trips up to current page
          hasMore: hasMoreTrips,
          loadingMore: false
        };
        return updatedMessages;
      } else {
        // If there's no flight message yet, add it
        const newMessage: FlightMessage = {
          from: 'bot',
          type: 'flight',
          text: 'Доступные рейсы:',
          data: allTrips.slice(0, endIndex),
          hasMore: hasMoreTrips,
          loadingMore: false
        };
        return [...prev, newMessage];
      }
    });
  }, []);
  
  // Обработчик нажатия на кнопку "Показать ещё"
  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    // Имитация задержки загрузки
    setTimeout(() => {
      loadMoreTrips(trips, currentPage + 1);
      setLoadingMore(false);
    }, 500);
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Load initial trips
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:4000/api/flights');
        if (!response.ok) {
          throw new Error(`Ошибка HTTP! статус: ${response.status}`);
        }
        const apiData = await response.json();
        
        // Define the API trip type
        interface ApiTrip {
          id: number;
          flight_number: string;
          transport_type: TransportType;
          departure_city: string;
          arrival_city: string;
          departure_time: string;
          arrival_time: string;
          price: number;
          available_seats: number;
          status: string;
        }
        
        // Map API response to match our frontend's expected format
        const mappedTrips: Trip[] = apiData.map((trip: ApiTrip) => {
          const baseTrip = {
            ...trip,
            number: trip.flight_number, // Map flight_number to number
            type: trip.transport_type   // Map transport_type to type
          };
          
          // Add default amenities for bus trips if not present
          if (trip.transport_type === 'bus' && !('amenities' in trip)) {
            return {
              ...baseTrip,
              bus_type: 'standard',
              amenities: ['Кондиционер', 'Розетки', 'Wi-Fi']
            };
          }
          
          return baseTrip;
        });
        
        setTrips(mappedTrips);
        
        // Initial greeting message
        const greetingMessage: Message = { 
          from: 'bot', 
          type: 'message',
          text: 'Здравствуйте! Вот доступные рейсы на ближайшее время. Нажмите "Показать ещё", чтобы увидеть больше вариантов.' 
        };
        
        setMessages([greetingMessage]);
        
        // Initially load only 1 trip
        if (mappedTrips.length > 0) {
          const initialTrips = [mappedTrips[0]];
          const hasMore = mappedTrips.length > 1;
          
          const flightMessage: FlightMessage = {
            from: 'bot',
            type: 'flight',
            text: 'Доступные рейсы:',
            data: initialTrips,
            hasMore,
            loadingMore: false
          };
          
          setMessages(prev => [...prev, flightMessage]);
          setSelectedTrip(mappedTrips[0]);
        }
      } catch (error) {
        console.error('Error fetching trips:', error);
        const errorMessage: Message = { 
          from: 'bot', 
          type: 'message',
          text: 'Извините, не удалось загрузить список рейсов. Пожалуйста, попробуйте позже.' 
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [loadMoreTrips]);

  // Форматирование времени
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Europe/Moscow' 
    });
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      weekday: 'long',
      timeZone: 'Europe/Moscow'
    };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };
  
  // Генерация подсказок на основе ввода пользователя
  const generateSuggestions = (inputText: string) => {
    if (!inputText.trim()) {
      // Если поле пустое, показываем популярные запросы
      const allSuggestions = [...new Set([...searchHistory, ...suggestionTemplates])];
      return allSuggestions.slice(0, 5);
    }

    // Фильтруем подсказки по введенному тексту
    const filtered = suggestionTemplates.filter(template => 
      template.toLowerCase().includes(inputText.toLowerCase())
    );

    // Добавляем историю поиска, если есть совпадения
    const historySuggestions = searchHistory.filter(item => 
      item.toLowerCase().includes(inputText.toLowerCase())
    );

    // Объединяем и убираем дубликаты
    return [...new Set([...historySuggestions, ...filtered])].slice(0, 5);
  };

  // Обработчик изменения ввода
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    const newSuggestions = generateSuggestions(value);
    setSuggestions(newSuggestions);
    setShowSuggestions(true);
  };

  // Обработчик выбора подсказки
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    
    // Добавляем выбранную подсказку в историю
    setSearchHistory(prev => {
      const newHistory = [suggestion, ...prev.filter(item => item !== suggestion)];
      return newHistory.slice(0, 10); // Сохраняем только 10 последних запросов
    });
    
    // Фокус на поле ввода
    inputRef.current?.focus();
  };

  // Обработчик клика вне блока подсказок
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Фокус на поле ввода при монтировании и после обновления сообщений
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages]);

  // Получение названия типа транспорта
  const getTransportName = (type: TransportType): string => {
    switch(type) {
      case 'airplane': return 'Самолёт';
      case 'train': return 'Поезд';
      case 'bus': return 'Автобус';
      default: return '';
    }
  };

  // Добавление города в историю поиска
  const addCityToHistory = (city: string) => {
    setSearchHistory(prev => {
      const newHistory = [city, ...prev.filter(item => item !== city)];
      return newHistory.slice(0, 10);
    });
  };

  // Обработка выбора поездки
  const handleTripSelect = (trip: Trip) => {
    setSelectedTrip(trip);
    
    // Добавляем города в историю поиска
    addCityToHistory(trip.departure_city);
    addCityToHistory(trip.arrival_city);
    
    let tripType = '';
    switch(trip.type) {
      case 'airplane':
        tripType = 'рейс';
        break;
      case 'train':
        tripType = 'поезд';
        break;
      case 'bus':
        tripType = 'автобус';
        break;
      default:
        tripType = 'рейс';
    }
    
    const tripNumber = trip.number || 'N/A';
    
    setMessages(prev => [...prev, {
      from: 'user',
      type: 'message',
      text: `Выбрал ${tripType} ${tripNumber} (${trip.departure_city} → ${trip.arrival_city})`
    }]);
    
    // Запрашиваем количество пассажиров
    setMessages(prev => [...prev, {
      from: 'bot',
      type: 'message',
      text: `Отлично! ${tripType} ${tripNumber} выбран. На сколько пассажиров бронируем билеты?`
    }]);
  };

  // Рендер содержимого сообщения в зависимости от типа
  const renderMessageContent = (msg: Message) => {
    // Обработка сообщений с рейсами (как от Dialogflow, так и от бэкенда)
    if (msg.type === 'flight' && 'data' in msg) {
      // Обработка старого формата FlightMessage
      const trips = msg.data;
      return (
        <div className={styles.tripsList}>
          <h4>{msg.text || 'Доступные рейсы:'}</h4>
          {trips.map((trip: Trip) => (
            <div key={trip.id} className={`${styles.tripCard} ${selectedTrip?.id === trip.id ? styles.selected : ''}`}>
              <div className={styles.tripHeader}>
                <div className={styles.tripType}>
                  {trip.type === 'airplane' && '✈️'}
                  {trip.type === 'train' && '🚆'}
                  {trip.type === 'bus' && '🚌'}
                  <span className={styles.tripNumber}>
                    {getTransportName(trip.type)} {trip.number}
                  </span>
                </div>
                <span className={styles.tripStatus} data-status={trip.status}>
                  {trip.status === 'scheduled' ? 'По расписанию' : 
                   trip.status === 'on_time' ? 'По расписанию' : 
                   trip.status === 'delayed' ? 'Задержан' : 'Отменен'}
                </span>
              </div>
              
              <div className={styles.tripRoute}>
                <div className={styles.tripSegment}>
                  <div className={styles.tripTime}>{formatTime(trip.departure_time)}</div>
                  <div className={styles.tripCity}>{trip.departure_city}</div>
                  <div className={styles.tripDate}>{formatDate(trip.departure_time)}</div>
                </div>
                <div className={styles.tripDivider}>→</div>
                <div className={styles.tripSegment}>
                  <div className={styles.tripTime}>{formatTime(trip.arrival_time)}</div>
                  <div className={styles.tripCity}>{trip.arrival_city}</div>
                  <div className={styles.tripDate}>{formatDate(trip.arrival_time)}</div>
                </div>
              </div>
              
              {/* Дополнительная информация в зависимости от типа транспорта */}
              {trip.type === 'airplane' && (
                <div className={styles.tripDetails}>
                  <span>Терминал: {(trip as AirplaneTrip).terminal || 'Не указан'}</span>
                  <span>Багаж: {(trip as AirplaneTrip).baggage_allowance}</span>
                </div>
              )}
              
              {trip.type === 'train' && (
                <div className={styles.tripDetails}>
                  <span>Тип поезда: {(trip as TrainTrip).train_type}</span>
                  <span>Вагон: {(trip as TrainTrip).carriage_type === 'platzkart' ? 'Плацкарт' : 
                                (trip as TrainTrip).carriage_type === 'coupe' ? 'Купе' : 'Люкс'}</span>
                </div>
              )}
              
              {trip.type === 'bus' && (
                <div className={styles.tripDetails}>
                  <span>Тип автобуса: {(trip as BusTrip).bus_type === 'standard' ? 'Стандарт' : 
                                     (trip as BusTrip).bus_type === 'comfort' ? 'Комфорт' : 'Бизнес'}</span>
                  <span>Удобства: {(trip as BusTrip).amenities.join(', ')}</span>
                </div>
              )}
              
              <div className={styles.tripFooter}>
                <div className={styles.tripSeats}>
                  {trip.available_seats > 0 
                    ? `Осталось мест: ${trip.available_seats}`
                    : 'Мест нет'}
                </div>
                <div className={styles.tripPrice}>
                  от {trip.price.toLocaleString('ru-RU')} ₽
                </div>
                <button 
                  className={styles.bookButton}
                  onClick={() => handleTripSelect(trip)}
                  disabled={trip.available_seats === 0}
                >
                  {selectedTrip?.id === trip.id ? 'Выбран' : 'Выбрать'}
                </button>
              </div>
            </div>
          ))}
          
          {msg.hasMore && (
            <div className={styles.loadMoreContainer}>
              <button 
                className={styles.loadMoreButton}
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <span className={styles.spinner}></span>
                    Загрузка...
                  </>
                ) : (
                  'Показать ещё'
                )}
              </button>
            </div>
          )}
        </div>
      );
    }
    return <div className={styles.messageText}>{msg.text}</div>;
  };

  async function sendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input;
    
    // Save the input element reference before clearing the input
    
    // Create a properly typed user message
    const userMessage: Message = { 
      from: "user", 
      type: "message",
      text: userMsg 
    };
    
    setMessages((msgs) => [...msgs, userMessage]);
    setInput("");
    inputRef.current?.focus();
    setLoading(true);
    
    try {
      const currentSessionId = sessionId || `frontend-session-${Math.floor(Math.random() * 1000000)}`;
      
      // Send the message in Dialogflow webhook format
      const res = await fetch("http://localhost:4000/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryResult: {
            queryText: userMsg,
            languageCode: 'ru',
            intent: {
              displayName: 'Default Welcome Intent',
              isFallback: true
            },
            parameters: {
              fields: {}
            },
            allRequiredParamsPresent: true,
            fulfillmentText: '',
            outputContexts: []
          },
          session: `projects/trips-mevj/agent/sessions/${currentSessionId}`
        })
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setSessionId(currentSessionId);

      // Process the response from the backend
      if (data.fulfillmentText) {
        // Add the bot's text response
        const botMessage: Message = {
          from: "bot",
          type: "message",
          text: data.fulfillmentText
        };
        setMessages(msgs => [...msgs, botMessage]);
        
        // If there are flights in the response, add them as a flight message
        if (data.flights && Array.isArray(data.flights) && data.flights.length > 0) {
          interface ApiFlightResponse {
            id: number;
            number?: string;
            flight_number?: string;
            departure_city: string;
            arrival_city: string;
            departure_time: string;
            arrival_time: string;
            price: number | string;
            available_seats: number;
            status: string;
            type?: TransportType;
            transport_type?: string;
          }
          
          // Process flights from the backend response
          const processedFlights: Trip[] = data.flights.map((flight: ApiFlightResponse) => ({
            id: flight.id,
            number: flight.number || flight.flight_number || 'N/A',
            departure_city: flight.departure_city,
            arrival_city: flight.arrival_city,
            departure_time: flight.departure_time,
            arrival_time: flight.arrival_time,
            price: typeof flight.price === 'string' ? parseFloat(flight.price) : flight.price,
            available_seats: flight.available_seats,
            status: flight.status,
            type: (flight.type || flight.transport_type || 'bus') as TransportType
          }));
          
          // Create the flight message with processed data
          const flightMessage: FlightsMessage = {
            from: "bot",
            type: "flights",
            text: `Найдено ${processedFlights.length} рейсов`,
            flights: processedFlights,
            showMore: false
          };
          
          // Replace the last bot message with the flight results
          setMessages(msgs => {
            const newMessages = [...msgs];
            // Remove the last message if it's the same as our fulfillment text
            if (newMessages.length > 0 && 
                newMessages[newMessages.length - 1].from === 'bot' &&
                newMessages[newMessages.length - 1].text === data.fulfillmentText) {
              newMessages.pop();
            }
            return [...newMessages, flightMessage];
          });
        }
      } else if (data.queryResult && data.queryResult.fulfillmentText) {
        // Create a bot message with the response text
        const botMessage: Message = {
          from: "bot",
          type: "message",
          text: data.queryResult.fulfillmentText
        };
        
        // Проверяем, есть ли в ответе данные о рейсах
        if (data.queryResult.parameters && data.queryResult.parameters.flights) {
          const flights = data.queryResult.parameters.flights;
          
          // Если есть рейсы, добавляем их в состояние
          if (flights.length > 0) {
            setTrips(flights);
            
            // Добавляем сообщение о количестве найденных рейсов
            setMessages(msgs => [...msgs, botMessage]);
            
            // Добавляем блок с рейсами
            const flightsMessage: FlightMessage = {
              from: 'bot',
              type: 'flight',
              text: '',
              data: flights,
              hasMore: false,
              loadingMore: false
            };
            
            setMessages(msgs => [...msgs, flightsMessage]);
            return;
          } else {
            // Если рейсов не найдено, изменяем текст сообщения
            const noFlightsMessage: Message = {
              from: 'bot',
              type: 'message',
              text: 'По вашему запросу рейсов не найдено. Пожалуйста, измените параметры поиска.'
            };
            setMessages(msgs => [...msgs, noFlightsMessage]);
            return;
          }
        }
        
        // Если нет данных о рейсах, просто добавляем текстовое сообщение
        setMessages(msgs => [...msgs, botMessage]);
      }
    } catch {
      const errorMessage: Message = {
        from: "bot",
        type: "message",
        text: "Ошибка соединения с сервером."
      };
      setMessages((msgs) => [...msgs, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messages}>
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`${styles.message} ${msg.from === 'user' ? styles.user : styles.bot}`}
          >
            {renderMessageContent(msg)}
          </div>
        ))}
        {loading && <div className={`${styles.message} ${styles.bot}`}>...</div>}
        <div ref={bottomRef} />
      </div>
      <div className={styles.inputContainer} ref={suggestionsRef}>
        <form onSubmit={sendMessage} className={styles.inputForm}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Введите ваш запрос..."
            disabled={loading}
            autoComplete="off"
            style={{ color: '#000' }}
          />
          <button type="submit" disabled={loading}>
            Отправить
          </button>
        </form>
        {showSuggestions && (
          <div className={styles.suggestions}>
            {suggestions.map((suggestion, index) => (
              <div 
                key={index}
                className={styles.suggestionItem}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
