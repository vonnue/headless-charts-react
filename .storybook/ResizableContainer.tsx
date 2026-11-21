import type { ReactNode } from 'react';

/** Wrapper used by each chart's ResizableContainer story (#90). */
export const ResizableBox = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      resize: 'both',
      overflow: 'hidden',
      width: 400,
      height: 250,
      minWidth: 120,
      minHeight: 120,
      border: '1px dashed currentColor',
    }}
  >
    {children}
  </div>
);

export default ResizableBox;
