export const COUNTRIES = [
  { code: "IN", name: "India" }
];

export const STATES_BY_COUNTRY: Record<string, { code: string; name: string }[]> = {
  IN: [
    { code: "TN", name: "Tamil Nadu" },
    { code: "KA", name: "Karnataka" },
    { code: "KL", name: "Kerala" },
    { code: "AP", name: "Andhra Pradesh" },
    { code: "TS", name: "Telangana" },
    { code: "MH", name: "Maharashtra" },
    { code: "DL", name: "Delhi" }
  ]
};

export const CITIES_BY_STATE: Record<string, string[]> = {
  TN: ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", "Tirunelveli"],
  KA: ["Bengaluru", "Mysuru", "Mangalore"],
  KL: ["Kochi", "Thiruvananthapuram", "Kozhikode"],
  AP: ["Vijayawada", "Visakhapatnam", "Guntur"],
  TS: ["Hyderabad", "Warangal"],
  MH: ["Mumbai", "Pune", "Nagpur"],
  DL: ["New Delhi"]
};
