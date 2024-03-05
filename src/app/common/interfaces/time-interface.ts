import * as moment from "moment";

export interface Scheme {
    from: string;
    duration: string;
    fromMoment?: moment.Moment;
    till?: string;
    tillMoment?: moment.Moment;
  }

  export interface BreakScheme {
    startTime: string;
    scheme: Scheme[];
  }

  export interface Worker {
    name: string;
    id: string;
  }

  export interface LocationOption {
    id: string;
    name: string;
    filteredOptions?:any
  }
  export interface TaskOption {
    id: string;
    name: string;
    type: 'BREAK' | 'TASK' | '';
  }

  export interface TaskRegn {
    id?: string;
    startTime: string;
    endTime: string;
    duration: string;
    class?: string;
    selectedOption?: TaskOption;
    filteredOptions?: TaskOption[];
  }
