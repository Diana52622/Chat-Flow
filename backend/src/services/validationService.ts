export function validateCity(city: string): { isValid: boolean; errorMessage?: string } {
  if (!city) {
    return { 
      isValid: false, 
      errorMessage: 'Пожалуйста, укажите город' 
    };
  }

  const cityRegex = /^[\p{L}\s-]+$/u;
  if (!cityRegex.test(city)) {
    return { 
      isValid: false, 
      errorMessage: 'Название города может содержать только буквы, пробелы и дефисы' 
    };
  }

  if (city.length < 2 || city.length > 50) {
    return { 
      isValid: false, 
      errorMessage: 'Название города должно быть от 2 до 50 символов' 
    };
  }

  return { isValid: true };
}

export function validatePassengers(count: number): { isValid: boolean; errorMessage?: string } {
  if (isNaN(count) || !Number.isInteger(count) || count < 1 || count > 10) {
    return { 
      isValid: false, 
      errorMessage: 'Количество пассажиров должно быть целым числом от 1 до 10' 
    };
  }
  return { isValid: true };
}

export function validateTransport(transport: string): { isValid: boolean; errorMessage?: string } {
  const validTransports = ['поезд', 'автобус', 'самолет'];
  const normalizedTransport = transport.toLowerCase().trim();
  
  if (!validTransports.includes(normalizedTransport)) {
    return {
      isValid: false,
      errorMessage: `Поддерживаются только следующие типы транспорта: ${validTransports.join(', ')}`
    };
  }
  
  return { isValid: true };
}
