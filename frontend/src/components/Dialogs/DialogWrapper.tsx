"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useUIContext } from "src/app/contexts/UIContext";

type DialogWrapperProps = {
  children: React.ReactNode;
};
const DialogWrapper: React.FC<DialogWrapperProps> = ({ children }) => {
  const { setShowDialog, setHotKeysActive } = useUIContext();
  // const [loginError, setLoginError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const loginError = searchParams.get("loginError");

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center">
      {/* BACKDROP */}
      <div className="absolute inset-0 bg-slate-300 bg-opacity-10 backdrop-blur-sm z-30" />
      <div className="absolute left-1/2 transform -translate-x-1/2 top-16 z-30  rounded-sm shadow-lg bg-white ring-1 ring-black ring-opacity-5">
        <button
          onClick={async () => {
            if (loginError) {
              router.push("/");
            }
            setHotKeysActive(true);
            setShowDialog(null);
          }}
          className="absolute top-5 right-6 text-white hover:text-black"
        >
          ✖
        </button>
        <div className="flex flex-col items-center border-2 border-black bg-slate-800 m-3 p-4 shadow-md shadow-slate-800 text-white min-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DialogWrapper;
