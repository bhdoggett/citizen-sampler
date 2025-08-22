
import { useUIContext } from "../../contexts/UIContext";

const APIResponseDialog: React.FC = () => {
  const { apiResponseMessageRef } = useUIContext();

  return (
    <div className="mr-3">
      <h2 className="text-center text-lg font-bold">
        {apiResponseMessageRef.current}
      </h2>
    </div>
  );
};

export default APIResponseDialog;
