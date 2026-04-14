async function searchNHSSymptom(symptom) {
  try {
    const url = `https://api.nhs.uk/search?q=${encodeURIComponent(symptom)}`;
    const headers = {};
    // No API key provided for test
    
    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.log(`NHS API error: ${response.status} ${response.statusText}`);
      return [{
         title: "NHS General Triage Advice",
         description: "Listen to your body. Rest and hydrate. Contact 10111 immediately if it is a life-threatening emergency.",
         url: "https://www.nhs.uk"
      }];
    }

    const data = await response.json();
    return data.results?.slice(0, 3).map((result) => ({
      title: result.title,
      description: result.description,
      url: result.url,
    })) || [];
  } catch (err) {
    console.error("Fetch error:", err);
    return [{
       title: "NHS Guidelines (Fallback)",
       description: "Please check NHS general guidelines online for more information.",
       url: "https://www.nhs.uk"
    }];
  }
}

async function testNHS() {
  console.log("Testing NHS API for 'Headache'...");
  const results = await searchNHSSymptom("headache");
  console.log("Results:");
  console.log(JSON.stringify(results, null, 2));
}

testNHS();
