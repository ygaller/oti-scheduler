declare module 'react-big-calendar' {
  import { ComponentType, ReactNode } from 'react';

  export type View = 'month' | 'week' | 'work_week' | 'day' | 'agenda';

  export interface Event {
    id?: string | number;
    title?: ReactNode;
    start: Date;
    end: Date;
    allDay?: boolean;
    resource?: any;
  }

  export interface Resource {
    id: string | number;
    title?: ReactNode;
  }

  export interface SlotInfo {
    start: Date;
    end: Date;
    slots: Date[];
    action: 'select' | 'click' | 'doubleClick';
    bounds?: {
      x: number;
      y: number;
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    box?: {
      clientX: number;
      clientY: number;
      x: number;
      y: number;
    };
    resourceId?: string | number;
  }

  export type EventPropGetter<TEvent extends Event = Event> = (
    event: TEvent,
    start: Date,
    end: Date,
    isSelected: boolean
  ) => {
    className?: string;
    style?: React.CSSProperties;
  };

  export type SlotPropGetter = (
    date: Date,
    resourceId?: string | number
  ) => {
    className?: string;
    style?: React.CSSProperties;
  };

  export interface CalendarProps<TEvent extends Event = Event, TResource extends Resource = Resource> {
    localizer: any;
    events?: TEvent[];
    resources?: TResource[];
    resourceIdAccessor?: string | ((resource: TResource) => string | number);
    resourceTitleAccessor?: string | ((resource: TResource) => ReactNode);
    startAccessor?: string | ((event: TEvent) => Date);
    endAccessor?: string | ((event: TEvent) => Date);
    allDayAccessor?: string | ((event: TEvent) => boolean);
    titleAccessor?: string | ((event: TEvent) => ReactNode);
    tooltipAccessor?: string | ((event: TEvent) => string);
    popup?: boolean;
    popupOffset?: number | { x: number; y: number };
    onSelectSlot?: (slotInfo: SlotInfo) => void;
    onSelectEvent?: (event: TEvent, e: React.SyntheticEvent) => void;
    onDoubleClickEvent?: (event: TEvent, e: React.SyntheticEvent) => void;
    onKeyPressEvent?: (event: TEvent, e: React.SyntheticEvent) => void;
    onNavigate?: (newDate: Date, view: View, action: 'PREV' | 'NEXT' | 'TODAY' | 'DATE') => void;
    onView?: (view: View) => void;
    onDrillDown?: (date: Date, view: View) => void;
    onShowMore?: (events: TEvent[], date: Date) => void;
    view?: View;
    views?: View[] | { [key: string]: ComponentType | boolean };
    date?: Date;
    defaultDate?: Date;
    defaultView?: View;
    length?: number;
    toolbar?: boolean;
    popup?: boolean;
    popupOffset?: number | { x: number; y: number };
    selected?: TEvent;
    selectable?: boolean | 'ignoreEvents';
    longPressThreshold?: number;
    eventPropGetter?: EventPropGetter<TEvent>;
    slotPropGetter?: SlotPropGetter;
    dayPropGetter?: (date: Date) => { className?: string; style?: React.CSSProperties };
    showMultiDayTimes?: boolean;
    culture?: string;
    formats?: {
      dateFormat?: string | ((date: Date, culture?: string, localizer?: any) => string);
      dayFormat?: string | ((date: Date, culture?: string, localizer?: any) => string);
      dayHeaderFormat?: string | ((date: Date, culture?: string, localizer?: any) => string);
      dayRangeHeaderFormat?: string | (({ start, end }: { start: Date; end: Date }, culture?: string, localizer?: any) => string);
      agendaHeaderFormat?: string | (({ start, end }: { start: Date; end: Date }, culture?: string, localizer?: any) => string);
      agendaDateFormat?: string | ((date: Date, culture?: string, localizer?: any) => string);
      agendaTimeFormat?: string | ((date: Date, culture?: string, localizer?: any) => string);
      agendaTimeRangeFormat?: string | (({ start, end }: { start: Date; end: Date }, culture?: string, localizer?: any) => string);
      timeGutterFormat?: string | ((date: Date, culture?: string, localizer?: any) => string);
      monthHeaderFormat?: string | ((date: Date, culture?: string, localizer?: any) => string);
      dayHeaderFormat?: string | ((date: Date, culture?: string, localizer?: any) => string);
      eventTimeRangeFormat?: (range: { start: Date; end: Date }, culture?: string, localizer?: any) => string;
      eventTimeRangeStartFormat?: string | (({ start, end }: { start: Date; end: Date }, culture?: string, localizer?: any) => string);
      eventTimeRangeEndFormat?: string | (({ start, end }: { start: Date; end: Date }, culture?: string, localizer?: any) => string);
      selectRangeFormat?: string | (({ start, end }: { start: Date; end: Date }, culture?: string, localizer?: any) => string);
    };
    messages?: {
      date?: string;
      time?: string;
      event?: string;
      allDay?: string;
      week?: string;
      work_week?: string;
      day?: string;
      month?: string;
      previous?: string;
      next?: string;
      yesterday?: string;
      tomorrow?: string;
      today?: string;
      agenda?: string;
      noEventsInRange?: string;
      showMore?: (total: number) => string;
    };
    components?: {
      event?: ComponentType<any>;
      eventWrapper?: ComponentType<any>;
      dayWrapper?: ComponentType<any>;
      dateCellWrapper?: ComponentType<any>;
      timeSlotWrapper?: ComponentType<any>;
      timeGutterHeader?: ComponentType<any>;
      resourceHeader?: ComponentType<any>;
      toolbar?: ComponentType<any>;
      agenda?: {
        date?: ComponentType<any>;
        time?: ComponentType<any>;
        event?: ComponentType<any>;
      };
      day?: {
        header?: ComponentType<any>;
        event?: ComponentType<any>;
      };
      week?: {
        header?: ComponentType<any>;
        event?: ComponentType<any>;
      };
      month?: {
        header?: ComponentType<any>;
        dateHeader?: ComponentType<any>;
        event?: ComponentType<any>;
      };
    };
    step?: number;
    timeslots?: number;
    rtl?: boolean;
    backgroundEvents?: TEvent[];
    style?: React.CSSProperties;
    className?: string;
    elementProps?: React.HTMLAttributes<HTMLDivElement>;
    getNow?: () => Date;
    scrollToTime?: Date;
    dayLayoutAlgorithm?: string | ComponentType<any>;
    resizable?: boolean;
    resizableAccessor?: string | ((event: TEvent) => boolean);
    onEventResize?: (data: { event: TEvent; start: Date; end: Date }) => void;
    dragFromOutsideItem?: () => TEvent;
    onDropFromOutside?: (data: { start: Date; end: Date; allDay: boolean; resourceId?: string | number }) => void;
    draggableAccessor?: string | ((event: TEvent) => boolean);
    onEventDrop?: (data: { event: TEvent; start: Date; end: Date; resourceId?: string | number; isAllDay: boolean }) => void;
    min?: Date;
    max?: Date;
  }

  export class Calendar<TEvent extends Event = Event, TResource extends Resource = Resource> extends React.Component<
    CalendarProps<TEvent, TResource>
  > {}

  export function dateFnsLocalizer(config: {
    format: (date: Date, formatStr: string, options?: any) => string;
    parse: (str: string, formatStr: string, backupDate: Date, options?: any) => Date;
    startOfWeek: (date: Date, options?: any) => Date;
    getDay: (date: Date) => number;
    locales?: { [key: string]: any };
  }): any;

  export function momentLocalizer(moment: any): any;
  export function globalizeLocalizer(globalize: any): any;
  export function dayjsLocalizer(dayjs: any): any;
}
