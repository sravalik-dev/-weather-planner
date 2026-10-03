import {
  API_BASE_URL,
  getAuthHeaders,
  readApiError,
} from '../utils/apiUtils';

export const getDestinations = async (tripId) => {
  const response = await fetch(
    `${API_BASE_URL}/api/trips/${tripId}/destinations`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const destinations = await response.json();

  return Array.isArray(destinations)
    ? [...destinations].sort(
        (a, b) =>
          Number(a.destinationOrder || 0) -
          Number(b.destinationOrder || 0)
      )
    : [];
};

export const addDestination = async (
  tripId,
  destinationData
) => {
  const response = await fetch(
    `${API_BASE_URL}/api/trips/${tripId}/destinations`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(destinationData),
    }
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return response.json();
};

export const deleteDestination = async (
  tripId,
  destinationId
) => {
  const response = await fetch(
    `${API_BASE_URL}/api/trips/${tripId}/destinations/${destinationId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return true;
};

export const reorderDestinations = async (
  tripId,
  destinationIds
) => {
  const response = await fetch(
    `${API_BASE_URL}/api/trips/${tripId}/destinations/reorder`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        destinationIds,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return response.json();
};