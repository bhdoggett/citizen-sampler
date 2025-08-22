
import { useUIContext } from "../../contexts/UIContext";

const UIWarning: React.FC = () => {
  const { uiWarningMessageRef } = useUIContext();

  return (
    <>
      <h2 className="text-center text-lg font-bold mb-3 mx-5">
        {uiWarningMessageRef.current}
      </h2>
    </>
  );
};

export default UIWarning;
