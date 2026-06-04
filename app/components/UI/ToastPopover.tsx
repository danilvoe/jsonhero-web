import {
  ExclamationCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/outline";
import * as ToastPrimitive from "@radix-ui/react-toast";
import cx from "~/utilities/classnames";
import { Body } from "../Primitives/Body";
import { Title } from "../Primitives/Title";

const getDisplayTitle = (title: string, type: string): string => {
  if (type === "error") return "Ошибка";
  if (type === "success") return "Успешно";
  return title;
};

const getDisplayMessage = (message: string): string => {
  const messages: Record<string, string> = {
    "Document not found": "Документ не найден",
    "Document is read-only": "Документ только для чтения",
    "Document deleted successfully": "Документ успешно удалён",
  };
  return messages[message] || message;
};

const getTypeStyles = (type: string) => {
  const isError = type === "error";
  const isSuccess = type === "success";

  if (isError) {
    return {
      rootClass: "bg-rose-50 dark:bg-rose-100",
      titleClass: "text-slate-900",
      bodyClass: "text-slate-700",
      icon: <ExclamationCircleIcon className="text-rose-700 h-7 w-7" />
    };
  }

  if (isSuccess) {
    return {
      rootClass: "bg-slate-50 dark:bg-slate-900",
      titleClass: "text-emerald-500",
      bodyClass: "text-emerald-500",
      icon: <InformationCircleIcon className="text-emerald-700 h-7 w-7" />
    };
  }

  return {
    rootClass: "bg-slate-50 dark:bg-slate-900",
    titleClass: "text-slate-600",
    bodyClass: "text-slate-600",
    icon: <InformationCircleIcon className="text-slate-700 h-7 w-7" />
  };
};

const Toast = ({
  message,
  title,
  duration,
  type,
}: {
  message: string;
  title: string;
  type: "success" | "error";
  duration?: number;
}) => {
  const commonRootClasses = cx(
    "z-50 fixed top-4 left-4 py-2 w-auto md:top-4 md:right-4 md:left-auto md:top-auto md:w-full md:max-w-sm shadow-lg rounded-md",
    "border-[1px]",
    "radix-state-open:animate-toast-slide-in-top md:radix-state-open:animate-toast-slide-in-right",
    "radix-state-closed:animate-toast-hide",
    "radix-swipe-end:animate-toast-swipe-out",
    "translate-x-radix-toast-swipe-move-x",
    "radix-swipe-cancel:translate-x-0 radix-swipe-cancel:duration-200 radix-swipe-cancel:ease-[ease]",
    "focus:outline-none focus-visible:ring focus-visible:ring-indigo-500 focus-visible:ring-opacity-75"
  );

  const styles = getTypeStyles(type);
  
  const displayTitle = getDisplayTitle(title, type);
  const displayMessage = getDisplayMessage(message);

  return (
    <ToastPrimitive.Provider duration={duration ?? 2500}>
      <ToastPrimitive.Root className={cx(commonRootClasses, styles.rootClass)}>
        <div className="flex">
          <div className="flex-1 flex items-center">
            <div className="flex px-4">{styles.icon}</div>
            <div className="w-full radix">
              <Title className={cx("-mb-0.5", styles.titleClass)}>{displayTitle}</Title>
              <Body className={cx("mb-0.5", styles.bodyClass)}>{displayMessage}</Body>
            </div>
          </div>
        </div>
      </ToastPrimitive.Root>

      <ToastPrimitive.Viewport />
    </ToastPrimitive.Provider>
  );
};

export default Toast;