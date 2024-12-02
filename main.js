require([
  'esri/Map',
  'esri/views/MapView',
  'esri/layers/FeatureLayer',
  'esri/symbols/SimpleFillSymbol',
  'esri/layers/GraphicsLayer',
  'esri/Graphic',
  'esri/core/reactiveUtils'
], (
  Map,
  MapView,
  FeatureLayer,
  SimpleFillSymbol,
  GraphicsLayer,
  Graphic,
  reactiveUtils
) => {
  body = document.getElementsByTagName('body')
  const tamanoPantalla = [body[0].clientWidth, body[0].clientWidth]
  console.log(tamanoPantalla)
  let centroides = []
  let centroidesTransformados

  const mapa = new Map({
    basemap: 'dark-gray-vector'
  })

  const vista = new MapView({
    container: 'mapaDiv',
    map: mapa,
    zoom: 5,
    center: [-4, 40]
  })

  // Provincias FL Renderer

  const simpleFillSymbol = new SimpleFillSymbol({
    outline: {
      cap: 'round',
      color: [0, 255, 204, 0.3],
      join: 'round',
      miterLimit: 1,
      style: 'solid',
      width: 0.5
    },
    style: 'solid'
  })

  const provinciasRenderer = {
    type: 'simple',
    symbol: simpleFillSymbol
  }

  const provinciasFl = new FeatureLayer({
    portalItem: {
      id: '503ef1cb832f4e8bb4be7fc024ad9aa2'
    },
    renderer: provinciasRenderer,
    effect: 'bloom(1, 1px, 0.0)'
  })

  const communityBuildersFl = new FeatureLayer({
    portalItem: {
      id: '231c32bc0150403a973c4289ee8bba60'
    }
  })

  mapa.addMany([communityBuildersFl, provinciasFl])

  // Cuando se carga esta capa se hace la llamada

  vista.whenLayerView(provinciasFl).then(() => {
    provinciasFl.queryFeatures().then((results) => {
      const resultadoFeatures = results.features
      resultadoFeatures.map((entidad) => {
        centroides.push(entidad.geometry.extent.center)
      })
    })
  })

  reactiveUtils.watch(
    () => vista.extent,
    () => {
      if (vista.zoom > 5) {
        const elementos = document.querySelectorAll('.popup-centroide')
        elementos.forEach((elemento) => {
          elemento.remove()
        })

        centroidesTransformados = centroides.map((centroide) => {
          return vista.toScreen(centroide)
        })

        centroidesTransformados.map((centro) => {
          const divPopup = document.createElement('div')
          divPopup.className = 'popup-centroide'
          divPopup.style.left = `${centro.x - 100 / 2}px`
          divPopup.style.top = `${centro.y - 75 / 2}px`
          const parentNode = document.getElementById('mapaDiv')
          document.body.insertBefore(divPopup, parentNode)
        })

        const centrosFiltrados = centroidesTransformados.filter((centroide) => {
          if (
            0 < centroide.x &&
            centroide.x < tamanoPantalla[0] &&
            0 < centroide.y &&
            centroide.y < tamanoPantalla[1]
          ) {
            return true
          } else {
            return false
          }
        })
      } else {
        const elementos = document.querySelectorAll('.popup-centroide')
        elementos.forEach((elemento) => {
          elemento.remove()
        })
      }

      centroidesTransformados = centroides.map((centroide) => {
        return vista.toScreen(centroide)
      })
    }
  )

  // Gestión del movimiento del mapa
})
