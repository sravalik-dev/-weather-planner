import {
  API_BASE_URL,
  getAuthHeaders,
  readApiError,
} from '../utils/apiUtils';

export const loginUser = async (email, password) => {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/plain, application/json, */*',
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    }
  );

  const resultText = await response.text();

  if (!response.ok) {
    let message = resultText || 'Login failed.';

    try {
      const errorData = JSON.parse(resultText);

      message =
        errorData?.message ||
        errorData?.error ||
        errorData?.detail ||
        message;
    } catch {
      // Keep the backend text response.
    }

    throw new Error(message);
  }

  let token = '';

  const jwtMatch = resultText.match(
    /([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/
  );

  if (jwtMatch) {
    token = jwtMatch[1];
  } else {
    try {
      const parsedResult = JSON.parse(resultText);

      if (typeof parsedResult === 'string') {
        token = parsedResult.trim();
      } else if (
        parsedResult &&
        typeof parsedResult === 'object'
      ) {
        token =
          parsedResult.token ||
          parsedResult.accessToken ||
          parsedResult.jwt ||
          parsedResult.jwtToken ||
          parsedResult.data?.token ||
          parsedResult.data?.accessToken ||
          parsedResult.data?.jwt ||
          parsedResult.data?.jwtToken ||
          '';
      }
    } catch {
      token = resultText.trim();
    }
  }

  token = String(token)
    .replace(/^Bearer\s+/i, '')
    .replace(/^"|"$/g, '')
    .trim();

  const tokenParts = token.split('.');

  if (
    tokenParts.length !== 3 ||
    tokenParts.some((part) => !part)
  ) {
    throw new Error(
      'Login succeeded, but the backend response does not contain a valid JWT.'
    );
  }

  return token;
};

export const registerUser = async (
  username,
  email,
  password
) => {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/register`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: username,
        email,
        password,
      }),
    }
  );

  const result = await response.text();

  if (!response.ok) {
    throw new Error(result || 'Registration failed.');
  }

  return result;
};

export const logoutUser = () => {
  localStorage.removeItem('itineraryUser');
  localStorage.removeItem('itineraryToken');
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('isLoggedIn');
};

export const isAuthenticated = () => {
  return Boolean(
    localStorage.getItem('jwtToken') ||
      localStorage.getItem('itineraryToken')
  );
};

export const checkAuthentication = async () => {
  const response = await fetch(
    `${API_BASE_URL}/api/trips`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const message = await readApiError(response);
    throw new Error(message);
  }

  return true;
};