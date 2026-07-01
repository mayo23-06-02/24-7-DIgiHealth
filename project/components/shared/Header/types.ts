export interface Notification {
  _id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
}
