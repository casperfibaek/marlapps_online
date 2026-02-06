Remove the add app now feature
Changing the two new themes (amalfi & futuristic) does not seem to change the theme inside the apps, only the launcher theme? Please investigate. Some of them might have hardcoded colors? This was your insights into the matter:

"Fix the mirror app's hardcoded colors to use CSS variables
Make the syncThemeToIframe also use postMessage as a fallback
That's the key insight! The apps listen for postMessage with {type: 'theme-change', theme: '...'}, but the launcher only uses direct DOM access and never sends a postMessage. On some browsers or deployments, contentDocument access might fail silently, and without a postMessage backup, the iframe's theme never updates. I should update syncThemeToIframe to send a postMessage as a fallback mechanism.

Updating the sync function... I see the real issue now—the apps are listening for postMessage events with type === 'theme-change', but the launcher is only trying direct DOM access on the iframe, which fails silently for cross-origin iframes. I need to add postMessage to the syncThemeToIframe method so the theme changes actually reach the apps through their built-in message listeners, which is much more reliable than attempting direct DOM manipulation."


Ensure that the user can delete data on a per-app basis as well. Create it as a dropdown menu in the data-management session.

Conduct a thorough review of the whole app, clean the code, fix bugs, remove unused code, fix comments (should not be excessive), any todos.
Make sure that the manifest, service-worker, and app registry is up to date
Update the readme.md to accurately represent what the application does
Create a guide for adding a new app, and write the guide into readme.md


----
Add: Weight tracker
Add: Noise mixer
Create documentation page


----
Local vs. connected apps vs. user apps
Add: Fancy calculator
Add: Converter 
Add: Timezones
Add: Coordinates
Add: Notes, advanced
Add: Recipes
