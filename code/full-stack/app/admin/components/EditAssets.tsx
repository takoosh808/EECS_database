import {Asset} from "../../types";
import {useState} from "react"
type Props = {
    data: Asset[];
}

export default function EditAssetsView({data}: Props) {
    const defaultImage = "/globe.svg";

    //will work on this function next sprint, will take more time than adding/removing 
    async function edit(asset: Asset)
    {

    }

    async function remove(asset: Asset)
    {
         try{
            const res = await fetch("/api/assets/edit/remove", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id: asset.id}),
            });
            if (!res.ok) throw new Error("Failed to approve return");
        }
        catch(err)
        {
            console.error(err);
        }
    }


    const [editView] = useState<"edit">("edit");

    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {data.map((asset) => (
            <div
              key={asset.id}
              className="border rounded-lg shadow p-4 flex flex-col items-center"
            >
              {/* Asset Image */}
              <img
                src={defaultImage}
                alt={asset.name}
                className="w-32 h-32 object-cover mb-2 rounded"
              />

              {/* Asset Name */}
              <h3 className="font-bold text-lg mb-1">{asset.name}</h3>

              {/* Description Placeholder */}
              <p className="text-gray-600 text-sm">
                NO DESCRIPTION YET
              </p>
              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={()=> edit(asset)}
                  className="px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={()=> remove(asset)}
                  className="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 cursor-pointer"
                >
                  Remove
                </button>
                </div>
            </div>
          ))}
        </div>
      </div>
  );
}