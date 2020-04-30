# seatable-plugin-map
Map plugin for SeaTable

## Plug-in instructions
> Plug-in development basic configuration reference：[dtable-plugin-template Plug-in development documentation](https://github.com/seatable/seatable-plugin-template)

### Clone project to local
`git@github.com:seatable/seatable-plugin-map.git`

### Install dependencies
 Run  `npm install`

### Add Google Maps development key

Add the development key authorized by Google Maps in the settings configuration file (refer to the detailed steps)：[Account and key acquisition](https://cloud.google.com/maps-platform/)，add the following configuration in the setting.js file.

```
window.dtable = window.dtable ? window.dtable : {};
window.dtable['dtableGoogleMapKey'] = '**';
```

**note：** window.dtable['dtableGoogleMapKey'] is Key for you

### Run tests locally

Run `npm start`, you can see the displayed map in the browser

### Integration Testing

Run `npm run build-plugin`, upload to dtable using the plugin，then click on the plugin，finally you can see the displayed map in the interface.

### Development

According to the needs, update the plug-in to complete the function
