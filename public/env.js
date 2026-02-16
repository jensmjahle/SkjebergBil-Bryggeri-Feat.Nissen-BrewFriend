window.env = {
  // Use the same host as the opened frontend page, but backend port 3000.
  // This works on desktop + mobile on the same network.
  VITE_API_URL: `${window.location.protocol}//${window.location.hostname}:3000`,
};
