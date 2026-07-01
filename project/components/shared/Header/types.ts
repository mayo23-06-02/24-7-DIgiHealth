export interface Notification {
  _id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface WeatherData {
  temp: number;
  condition: string;
  location: string;
  icon?: React.ReactNode;
}
