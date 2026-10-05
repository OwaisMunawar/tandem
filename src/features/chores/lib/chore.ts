import { type LocalDate, type LocalTime } from './localDate';
import { type Recurrence } from './recurrence';

export type Chore = {
  id: string;
  title: string;
  assigneeId: string;
  rotation: string[];
  recurrence: Recurrence;
  dueDate: LocalDate;
  dueTime: LocalTime;
  createdAt: number;
  lastDoneAt: number;
  lastDoneBy: string;
};

export type ChoreDraft = Pick<Chore, 'title' | 'recurrence' | 'dueDate'> &
  Partial<Pick<Chore, 'assigneeId' | 'rotation' | 'dueTime'>>;

export type ChorePatch = Partial<
  Pick<Chore, 'title' | 'assigneeId' | 'rotation' | 'recurrence' | 'dueDate' | 'dueTime'>
>;
