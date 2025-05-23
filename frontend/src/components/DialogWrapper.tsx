"use client";

type DialogWrapperProps = {
  children: React.ReactNode;
};
const DialogWrapper: React.FC<DialogWrapperProps> = ({ children }) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center">
      {/* BACKDROP */}
      <div className="absolute inset-0 bg-black bg-opacity-20 backdrop-blur-sm z-30" />

      <div className="absolute left-1/2 transform -translate-x-1/2 top-28 z-30 w-[650px] rounded-sm shadow-lg bg-white ring-1 ring-black ring-opacity-5">
        {children}
      </div>
    </div>
  );
};

export default DialogWrapper;
