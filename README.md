# EECS_database
## Project summary

### One-sentence description of the project

Database system for checking out and requesting assets from the college of ELectrical Engineering and Computer Science at Washington State University.

### Additional information about the project

The EECS department at WSU has assets that are shared within their department. Often times, sharing these assets can be difficult. The current system in place is outdated and inefficient, causing some assets to be purchased that are already present. Our project aims to solve this problem. The school of electrical engineering and computer science has a wide array of different items in their inventory, but no way to efficiently track where all these items are or keep an updated list without manually updating it every few cycles. So far, the inventory has been kept on an excel spreadsheet thus far, meaning that it doesn’t have any auto-ingestion or easy data analytic capabilities. Along with this, if the inventory were to update, the head of the EECS laboratories, Mr. Michael Herrboldt, would need to keep track of these updates by hand. 
The college also works hand in hand with the rest of the Voiland College of Engineering and Architecture, who use the assets of each department when needed, but can also cross-utilize assets if another department has them on hand. But herein lies the issue, as there is no online way to quickly check if another department, specifically the EECS department, has the assets that they need. This results in the extra purchasing of equipment when the college already had several on hand, giving a potential savings opportunity that the college could be putting into other areas such as research and grants.  
Another issue that will be solved is the manual entry of assets into a database system, which is slow and requires the manual collection of all assets or a manual audit in which all assets are inventoried by going around and documenting all of them. This results in investing a large amount of time and effort into tracking down assets every time something new is added, removed, or repaired. By creating a new system that tracks all of the assets, we can also add data analytics that show what the most popular items are, which ones need repair, and which ones can be donated or recycled, resulting in a more efficient use of EECS funds by optimizing the assets that are on hand. 
The main problem that we have derived from this project is that there is no system set in place to handle the kinds of workloads that the EECS laboratories need to function like a modern system for inventorying purposes. We also need to create a web application that integrates well into the WSU system, using Okta verify.
We determined that our solution is a web application with a dashboard that displays the EECS assets and allows for querying powered by a robust database that accepts excel data ingestion. Our main goal is to aid in the workflow of EECS faculty members looking to rent out or purchase equipment for their research without creating redundant assets for no reason. 
This will be further supported by our requirement to allow complex and efficient querying on the database, as well as live analytics that will display unmet needs for certain assets and most used assets to allow for continuous monitoring of the health of the EECS inventory. The web app will need to be easy to navigate and display all the necessary functionalities like the dashboard, search bar, and analytics like items that need to be bought to meet the needs of the EECS department. There will also need to be robust authorization and separation of privileges from admin to user, where the user will submit requests for new assets, categories, laboratory sections, etc. and the admin will permit and fulfill these requests. 

## Installation

### Prerequisites

TODO: List what a user needs to have installed before running the installation instructions below (e.g., git, which versions of Ruby/Rails)

### Add-ons

TODO: List which add-ons are included in the project, and the purpose each add-on serves in your app.

### Installation Steps

TODO: Describe the installation process (making sure you mention `bundle install`).
Instructions need to be such that a user can just copy/paste the commands to get things set up and running. 


## Functionality

TODO: Write usage instructions. Structuring it as a walkthrough can help structure this section,
and showcase your features.


## Known Problems

TODO: Describe any known issues, bugs, odd behaviors or code smells. 
Provide steps to reproduce the problem and/or name a file or a function where the problem lives.


## Contributing

TODO: Leave the steps below if you want others to contribute to your project.

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Additional Documentation

TODO: Provide links to additional documentation that may exist in the repo, e.g.,
  * Sprint reports
  * User links

## License

If you haven't already, add a file called `LICENSE.txt` with the text of the appropriate license.
We recommend using the MIT license: <https://choosealicense.com/licenses/mit/>
