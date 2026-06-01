import { useCallback, useEffect, useRef } from "react";
import { useVirtual } from "react-virtual";
import { ColumnViewNode } from "~/useColumnView";
import { LARGE_CONTAINER_CHILD_COUNT } from "~/performanceLimits";
import { ColumnItem } from "./ColumnItem";

const COLUMN_ITEM_HEIGHT = 44;

export type VirtualizedColumnItemsProps = {
  items: ColumnViewNode[];
  json: unknown;
  isItemSelected: (id: string) => boolean;
  isItemHighlighted: (id: string) => boolean;
  onClick?: (id: string) => void;
};

export function VirtualizedColumnItems(props: VirtualizedColumnItemsProps) {
  const { items } = props;
  const parentRef = useRef<HTMLDivElement>(null);

  if (items.length <= LARGE_CONTAINER_CHILD_COUNT) {
    return (
      <>
        {items.map((item) => (
          <ColumnItem
            key={item.id}
            item={item}
            json={props.json}
            isSelected={props.isItemSelected(item.id)}
            isHighlighted={props.isItemHighlighted(item.id)}
            onClick={props.onClick}
          />
        ))}
      </>
    );
  }

  return <LargeColumnItemsList {...props} parentRef={parentRef} />;
}

function LargeColumnItemsList({
  items,
  json,
  isItemSelected,
  isItemHighlighted,
  onClick,
  parentRef,
}: VirtualizedColumnItemsProps & {
  parentRef: React.RefObject<HTMLDivElement>;
}) {
  const rowVirtualizer = useVirtual({
    size: items.length,
    parentRef,
    estimateSize: useCallback(() => COLUMN_ITEM_HEIGHT, []),
    overscan: 12,
  });

  useEffect(() => {
    const index = items.findIndex(
      (item) => isItemSelected(item.id) || isItemHighlighted(item.id)
    );

    if (index >= 0) {
      rowVirtualizer.scrollToIndex(index, { align: "auto" });
    }
  }, [items, isItemSelected, isItemHighlighted, rowVirtualizer.scrollToIndex]);

  return (
    <div
      ref={parentRef}
      className="h-full w-full overflow-y-auto no-scrollbar"
    >
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.totalSize}px` }}
      >
        {rowVirtualizer.virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index];

          return (
            <div
              key={item.id}
              className="absolute left-0 top-0 w-full"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ColumnItem
                item={item}
                json={json}
                isSelected={isItemSelected(item.id)}
                isHighlighted={isItemHighlighted(item.id)}
                onClick={onClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
