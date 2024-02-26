import { BreakScheme, TaskOption, Worker } from "../interfaces/time-interface";

export const workerOptions: Worker[] = [
  { name: 'Bart', id: 'd7f4a8d4-cf67-424d-b698-f475785810b4' },
  { name: 'John', id: '2425bc63-4be8-4143-beef-4f471b6bf2d9' },
  { name: 'Rose', id: '36cafb11-7c55-45a5-8cf5-d96f75d630c1' },
];

export const breakScheme: BreakScheme = {
  startTime: '07:00',
  scheme: [
    { from: '09:00', duration: '00:15' },
    { from: '12:00', duration: '00:30' },
    { from: '15:00', duration: '00:15' },
  ],
};

export const tasksOptions: TaskOption[] = [
  { id: 'abc10', name: 'Pauze', type: 'break' },
  { id: 'abc11', name: 'Financien', type: 'task' },
  { id: 'abc12', name: 'HRM', type: 'task' },
  { id: 'abc13', name: 'Administratie algemeen', type: 'task' },
  { id: 'abc14', name: 'Overleg', type: 'task' },
  { id: 'abc15', name: 'Algemeen', type: 'task' },
];
