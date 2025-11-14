export interface ChartProps<TData = any> {
  id: string;
  data: TData[];
  className?: string;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    bar?: number;
  };
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  drawing?: {
    duration?: number;
    delay?: number;
  };
  zooming?: {
    enabled?: boolean;
    min?: number;
    max?: number;
  };
  style?: React.CSSProperties;
}
