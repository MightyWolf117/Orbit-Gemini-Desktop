const BASE_URL = "http://localhost:8080/api";

const ENDPOINTS = {
  HEALTH: `${BASE_URL}/health`,
  MODELS: `${BASE_URL}/models`,
  CHAT: `${BASE_URL}/chat`,
  UPLOAD: `${BASE_URL}/upload`,
  PERSONALITIES: `${BASE_URL}/personalities`,
  HISTORIAL: `${BASE_URL}/historial`,
  RUNTIMES: `${BASE_URL}/runtimes`
};

export { BASE_URL, ENDPOINTS };