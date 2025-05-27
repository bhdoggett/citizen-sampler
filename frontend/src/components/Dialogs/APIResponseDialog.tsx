"use client";

type APIResponseDialogProps = {
  apiResponseMessage: string | null;
};

const APIResponseDialog: React.FC<APIResponseDialogProps> = ({
  apiResponseMessage,
}) => {
  if (!apiResponseMessage) return null;

  return (
    <>
      <h2 className="text-center text-lg font-bold mb-3">
        {apiResponseMessage}
      </h2>
    </>
  );
};

export default APIResponseDialog;
