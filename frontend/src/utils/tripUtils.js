export const calculateTripDays = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return "";
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    return "";
  }

  return Math.floor((end - start) / 86400000) + 1;
};

export const normalizeTripFeatures = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export const normalizeTrip = (item) => {
  const trip = item?.trip || {};

  const rawFeatures =
    item?.features ??
    trip?.features ??
    "";

  return {
    tripId:
      item?.tripId ??
      item?.id ??
      trip?.tripId ??
      trip?.id,

    tripName:
      item?.tripName ??
      item?.name ??
      item?.title ??
      trip?.tripName ??
      trip?.name ??
      "Trip",

    origin:
      item?.origin ??
      trip?.origin ??
      "",

    destination:
      item?.destination ??
      trip?.destination ??
      "",

    startDate:
      item?.startDate ??
      trip?.startDate ??
      "",

    endDate:
      item?.endDate ??
      trip?.endDate ??
      "",

    noOfDays:
      item?.noOfDays ??
      item?.numberOfDays ??
      trip?.noOfDays ??
      trip?.numberOfDays ??
      "",

    noOfTravelers:
      item?.noOfTravelers ??
      item?.numberOfTravelers ??
      trip?.noOfTravelers ??
      trip?.numberOfTravelers ??
      "",

    budget:
      item?.budget ??
      trip?.budget ??
      "",

    pace:
      item?.pace ??
      trip?.pace ??
      "Balanced",

    features: normalizeTripFeatures(rawFeatures),

    status:
      item?.status ??
      trip?.status ??
      "",

    createdAt:
      item?.createdAt ??
      item?.createdDate ??
      trip?.createdAt ??
      trip?.createdDate ??
      null,

    updatedAt:
      item?.updatedAt ??
      trip?.updatedAt ??
      null,
  };
};

export const extractTripList = (payload) => {
  const raw = Array.isArray(payload)
    ? payload
    : payload?.content ||
      payload?.trips ||
      payload?.data ||
      payload?.items ||
      [];

  return raw
    .map((item, index) => {
      const trip = item?.trip || {};

      return {
        tripId:
          item?.tripId ??
          item?.id ??
          trip?.tripId ??
          trip?.id,

        tripName:
          item?.tripName ??
          item?.name ??
          item?.title ??
          trip?.tripName ??
          trip?.name ??
          `Trip ${index + 1}`,

        createdAt:
          item?.createdAt ??
          item?.createdDate ??
          item?.date ??
          trip?.createdAt ??
          trip?.createdDate ??
          null,

        status:
          item?.status ??
          trip?.status ??
          null,
      };
    })
    .filter((trip) => trip.tripId != null);
};

export const createTripActionHistoryEntry = (action, trip) => {
  return {
    id: `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,

    action,

    tripId:
      trip?.tripId ??
      null,

    tripName:
      trip?.tripName ||
      "Unnamed Trip",

    status:
      trip?.status ||
      "",

    timestamp:
      new Date().toISOString(),
  };
};