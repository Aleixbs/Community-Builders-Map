require([ "esri/Map", "esri/views/MapView", "esri/layers/FeatureLayer", "esri/symbols/SimpleFillSymbol" ], (Map, MapView, FeatureLayer, SimpleFillSymbol) => {
  const mapa = new Map({
    basemap: "dark-gray-vector"
  });

  const vista = new MapView({
    container: "mapaDiv",
    map: mapa,
    zoom: 5,
    center: [-4, 40]
  });

  // Provincias FL Renderer

  const simpleFillSymbol = new SimpleFillSymbol({
    outline: {
      cap: "round",
      color: [0,255,204,0.3],
      join: "round",
      miterLimit: 1,
      style: "solid",
      width: 0.5
    },
    style: "solid"
  });

  const provinciasRenderer = {
    type: "simple",  
    symbol: simpleFillSymbol
  };

  const provinciasFl = new FeatureLayer({
    portalItem: {
      id: '503ef1cb832f4e8bb4be7fc024ad9aa2'
    },
    renderer: provinciasRenderer,
    effect: 'bloom(1, 1px, 0.0)'
    
  })

  mapa.add(provinciasFl)

  // Cuando se carga esta capa se hace la llamada

  vista.whenLayerView(provinciasFl).then(() => {
    provinciasFl.queryFeatures().then(results => {
      console.log(results)
    })
  });

    

});