declare module 'frappe-gantt' {
  export type GanttTask = {
    id: string;
    name: string;
    start: string;
    end: string;
    progress?: number;
    custom_class?: string;
  };

  export type GanttOptions = {
    view_mode?: 'Day' | 'Week' | 'Month' | 'Year';
    language?: string;
    on_click?: (task: GanttTask) => void;
    on_date_change?: (task: GanttTask, start: Date, end: Date) => void;
  };

  export default class Gantt {
    constructor(selector: HTMLElement | string, tasks: GanttTask[], options?: GanttOptions);
    change_view_mode(mode: 'Day' | 'Week' | 'Month' | 'Year'): void;
  }
}
