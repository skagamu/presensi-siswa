export const API_URL = "https://script.google.com/macros/s/AKfycbwOoUV7vFnu056dBhc_tjVE_ORzHO2yEzCUsPRpPqEcTAuHGV9dSN2PAYDpON-7Xqup/exec";

// Helper function untuk POST (Simpan Data)
export const fetchGasApi = async (action: string, payload: any = {}) => {
  try {
    const urlWithQuery = `${API_URL}?action=${action}`;
    const response = await fetch(urlWithQuery, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
    });
    return await response.json();
  } catch (error) {
    console.error(`Error API GAS POST (${action}):`, error);
    throw error;
  }
};

// Helper function untuk GET (Ambil Data - Anti Redirect Loss)
export const fetchGasApiGet = async (action: string, queryParams: Record<string, string> = {}) => {
  try {
    const params = new URLSearchParams({ action, ...queryParams });
    const url = `${API_URL}?${params.toString()}`;
    
    const response = await fetch(url, {
      method: "GET",
      // GET tidak butuh headers khusus atau body
    });
    
    return await response.json();
  } catch (error) {
    console.error(`Error API GAS GET (${action}):`, error);
    throw error;
  }
};
