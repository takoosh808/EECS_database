import ActiveAssetsView from "./components/ActiveCheckout";
import AssetHistoryView from "./components/RequestHistory";
import RequestsView from "./components/Requests";

export default function AdminDashboard()
{
    return(
       <header className="">
            <div className="mx-auto px-8 py-4">
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <a>Manage assets and handle asset requests</a>
            </div>
            <RequestsView/>
            <ActiveAssetsView/>
            <AssetHistoryView/>
        </header>
    );
}