const axios = require('axios');
require('dotenv').config();

async function testAerialView() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const address = "Cel. José Aurélio Camara, 320, Vicente Pinzon, Fortaleza, CE, 60181-485, Brasil";
  
  try {
    const url = `https://aerialview.googleapis.com/v1/videos:renderVideo?key=${apiKey}`;
    const response = await axios.post(url, { address });
    console.log("RESPONSE:", response.data);
  } catch (err) {
    console.error("ERROR:", err.response ? err.response.data : err.message);
  }
}

testAerialView();
