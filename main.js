require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/symbols/SimpleFillSymbol",
  "esri/layers/GraphicsLayer",
  "esri/Graphic",
  "esri/core/reactiveUtils",
], (
  Map,
  MapView,
  FeatureLayer,
  SimpleFillSymbol,
  GraphicsLayer,
  Graphic,
  reactiveUtils
) => {
  // Calculo del tamaño de la pantalla

  body = document.getElementsByTagName("body");
  const tamanoPantalla = [body[0].clientWidth, body[0].clientWidth];

  // Variables globales

  let centroides = [];
  let centroidesTransformados;

  // Creación del Mapa

  const mapa = new Map({
    basemap: "dark-gray-vector",
  });

  // Creación de la vista

  const vista = new MapView({
    container: "mapaDiv",
    map: mapa,
    zoom: 5,
    center: [-4, 40],
  });

  // Renderer de la capa de polígonos

  const simpleFillSymbol = new SimpleFillSymbol({
    outline: {
      cap: "round",
      color: [0, 255, 204, 0.3],
      join: "round",
      miterLimit: 1,
      style: "solid",
      width: 0.5,
    },
    style: "solid",
  });

  const provinciasRenderer = {
    type: "simple",
    symbol: simpleFillSymbol,
  };

  // Capa de provincias

  const provinciasFl = new FeatureLayer({
    portalItem: {
      id: "503ef1cb832f4e8bb4be7fc024ad9aa2",
    },
    renderer: provinciasRenderer,
    effect: "bloom(1, 1px, 0.0)",
  });

  // Capa de Community Builders

  const communityBuildersFl = new FeatureLayer({
    portalItem: {
      id: "231c32bc0150403a973c4289ee8bba60",
    },
  });

  mapa.addMany([communityBuildersFl, provinciasFl]);

  // Cuando se carga esta capa se hace la llamada

  vista.whenLayerView(provinciasFl).then(() => {
    // Query a la capa de Provincias

    provinciasFl.queryFeatures().then((results) => {
      // Guardo las entidades y guardo todos los centroides de las provincias en el array de centroides

      const resultadoFeatures = results.features;
      resultadoFeatures.map((entidad) => {
        centroides.push(entidad.geometry.extent.center);
      });
    });
  });

  function crearElementoPopUpCentroide(centro) {
    const divPopup = document.createElement("div");
    divPopup.className = "popup-centroide";
    divPopup.style.left = `${centro.x - 100 / 2}px`;
    divPopup.style.top = `${centro.y - 75 / 2}px`;
    const parentNode = document.getElementById("mapaDiv");
    document.body.insertBefore(divPopup, parentNode);
  }

  // Creo un evento en el extent de la vista, es decir cuando la propiedad del extent de la vista cambie se ejecuta la funcion.

  reactiveUtils.watch(
    () => vista.extent,
    () => {
      if (vista.zoom > 6) {
        // Selecciono los elementos de popup que estamos creando y los elimino en cada cambio de extent

        const elementos = document.querySelectorAll(".popup-centroide");
        elementos.forEach((elemento) => {
          elemento.remove();
        });

        // Para cada uno de los centroides de las provincias, calculo el centroide en la vista y los guardo en centroides transformados

        centroidesTransformados = centroides.map((centroide) => {
          return vista.toScreen(centroide);
        });

        // Para cada uno de los centroides transformados creo un elemento PopUpCentroide

        centroidesTransformados.map((centro) => {
          crearElementoPopUpCentroide(centro);
        });
      } else {
        const elementos = document.querySelectorAll(".popup-centroide");
        elementos.forEach((elemento) => {
          elemento.remove();
        });
      }
    }
  );

  // Gestión del movimiento del mapa
});
