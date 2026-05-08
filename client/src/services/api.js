// client/src/services/api.js
import axios from "axios";

const http = axios.create({
  baseURL: "http://localhost:5000/api",
});

export async function listLeads({ search = "", status = "", page = 1 } = {}) {
  const { data } = await http.get("/leads", {
    params: { search, status, page, pageSize: 25 },
  });
  return data;
}

export async function getLead(id) {
  const { data } = await http.get(`/leads/${id}`);
  return data;
}

export async function updateLead(id, patch) {
  const { data } = await http.patch(`/leads/${id}`, patch);
  return data;
}

export async function getStats() {
  const { data } = await http.get("/stats");
  return data;
}