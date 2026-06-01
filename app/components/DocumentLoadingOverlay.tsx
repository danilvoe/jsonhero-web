import { LoadingIcon } from "~/components/Icons/LoadingIcon";

type DocumentLoadingOverlayProps = {
  title: string;
  subtitle?: string;
  percent: number;
  indeterminate?: boolean;
};

export function DocumentLoadingOverlay({
  title,
  subtitle,
  percent,
  indeterminate,
}: DocumentLoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90">
      <div className="w-full max-w-md px-8">
        <div className="mb-4 flex items-center justify-center gap-3 text-slate-200">
          <LoadingIcon className="h-8 w-8 animate-spin" />
          <p className="text-lg font-medium">{title}</p>
        </div>
        {subtitle ? (
          <p className="mb-4 text-center text-sm text-slate-400">{subtitle}</p>
        ) : null}
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-700"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={indeterminate ? undefined : percent}
        >
          <div
            className={`h-full rounded-full bg-lime-500 ${
              indeterminate ? "w-1/3 animate-pulse" : "transition-[width] duration-150"
            }`}
            style={indeterminate ? undefined : { width: `${percent}%` }}
          />
        </div>
        {!indeterminate ? (
          <p className="mt-2 text-center text-sm text-slate-400">{percent}%</p>
        ) : null}
      </div>
    </div>
  );
}
