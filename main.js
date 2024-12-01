require([ "esri/Map", "esri/views/MapView", "esri/layers/FeatureLayer", "esri/symbols/SimpleFillSymbol", "esri/layers/GraphicsLayer","esri/Graphic" ], (Map, MapView, FeatureLayer, SimpleFillSymbol, GraphicsLayer, Graphic) => {
  
  const tamanoPantralla = [window.screen.width, window.screen.height]
  
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

  let centroides = []
  let centroidesTransformados

  // Cuando se carga esta capa se hace la llamada

  vista.whenLayerView(provinciasFl).then(() => {

    provinciasFl.queryFeatures().then(results => {
      const resultadoFeatures = results.features

      const capaGrafica = new GraphicsLayer()

      resultadoFeatures.map((entidad)=>{
        centroides.push(entidad.geometry.extent.center)
      })

      const centroidesPintar = resultadoFeatures.map((entidad)=>{
        const centroidePintar = new Graphic({
          geometry: entidad.geometry.extent.center
        })
        return centroidePintar
      })

      capaGrafica.addMany(centroidesPintar)
      mapa.add(capaGrafica)

    })
  });

  

  vista.on('mouse-wheel',(evento)=>{
    if(vista.zoom >= 8){
      console.log(evento)

      const elementos = document.querySelectorAll('.popup-centroide')
      elementos.forEach((elemento)=>{
        elemento.remove()
      })



      setTimeout(()=>{

        centroidesTransformados = centroides.map((centroide) => {
          return vista.toScreen(centroide)
        })
  
        const centrosFiltrados = centroidesTransformados.filter((centroide)=>{
          if(( 0 < centroide.x && centroide.x < tamanoPantralla[0]) && ( 0 < centroide.y && centroide.y < tamanoPantralla[1])){
            return true
          }else{
            return false
          }
        })

        centrosFiltrados.map((centro)=>{
          console.log(centro.x)
          const divPopup = document.createElement('div')
          divPopup.className = 'popup-centroide'
          divPopup.style.left = `${centro.x-25}px`
          divPopup.style.top = `${centro.y-25}px`
          const parentNode = document.getElementById('mapaDiv')
          document.body.insertBefore(divPopup,parentNode)
        })
      },'200')
    }
  })
});