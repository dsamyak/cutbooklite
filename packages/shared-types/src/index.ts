export interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'BARBER';
}
