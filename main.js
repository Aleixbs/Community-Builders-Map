require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/symbols/SimpleFillSymbol",
  "esri/core/reactiveUtils",
  "esri/rest/support/Query",
  "esri/smartMapping/labels/clusters",
  "esri/smartMapping/renderers/pieChart",
], (
  Map,
  MapView,
  FeatureLayer,
  SimpleFillSymbol,
  reactiveUtils,
  Query,
  clusterLabelCreator,
  pieChartRendererCreator
) => {
  // Calculo del tamaño de la pantalla

  body = document.getElementsByTagName("body");
  const tamanoPantalla = [body[0].clientWidth, body[0].clientWidth];

  // Variables globales

  let centroides = [];
  let centroidesTransformados;
  let comunidades = [];

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
    popupEnabled: false,
  });

  // Capa de Community Builders

  // Renderer de la capa de Community Builders Unique Value Renderer

  const communityBuildersRenderer = {
    type: "unique-value",
    field: "Tipo_de_comunidad",
    defaultSymbol: {
      type: "simple-marker",
      style: "circle",
      color: "white",
      size: "8px",
    },
    uniqueValueInfos: [
      {
        value: "Tech Meetup",
        symbol: {
          type: "simple-marker",
          style: "circle",
          size: "8px",
          color: "#09ff00",
        },
      },
      {
        value: "Conferencia",
        symbol: {
          type: "simple-marker",
          style: "circle",
          size: "8px",
          color: "#00fff2",
        },
      },
      {
        value: "Grupo colaborativo",
        symbol: {
          type: "simple-marker",
          style: "circle",
          size: "8px",
          color: "#ddff00",
        },
      },
      {
        value: "Hacklab",
        symbol: {
          type: "simple-marker",
          style: "circle",
          size: "8px",
          color: "#ff1100",
        },
      },
    ],
  };

  // Capa Community Builders

  const communityBuildersFl = new FeatureLayer({
    portalItem: {
      id: "231c32bc0150403a973c4289ee8bba60",
    },
    renderer: communityBuildersRenderer,
  });

  // Creacion del Pie Chart Renderer

  communityBuildersFl.when().then(() => {
    generarConfiguracionCluster(communityBuildersFl, vista).then(
      (featureReduction) => {
        communityBuildersFl.featureReduction = featureReduction;
      }
    );
  });

  async function generarConfiguracionCluster(layer, view) {
    // Genera la labelingInfo default

    const { labelingInfo, clusterMinSize } = await clusterLabelCreator
      .getLabelSchemes({ layer, view })
      .then((labelSchemes) => labelSchemes.primaryScheme);

    const labelSymbol = labelingInfo[0].symbol;
    labelSymbol.color = [255, 255, 255, 1];
    labelSymbol.haloColor = [255, 255, 255, 0.3];
    labelSymbol.font.size = 10;

    const { renderer, fields } =
      await pieChartRendererCreator.createRendererForClustering({
        layer,
        shape: "donut",
      });

    renderer.holePercentage = 0.66;

    const fieldInfos = fields.map((field) => {
      return {
        fieldName: field.name,
        label: field.alias,
        format: {
          places: 0,
          digitSeparator: true,
        },
      };
    });

    const fieldNames = fieldInfos.map((field) => {
      return field.fieldName;
    });

    const popupTemplate = {
      content: [
        {
          type: "text",
          text: "<b>{cluster_count}</b> Comunidades.",
        },
        {
          type: "media",
          mediaInfos: [
            {
              title: "Tipo de comunidad",
              type: "pie-chart",
              value: {
                fields: fieldNames,
              },
            },
          ],
        },
        {
          type: "fields",
        },
      ],
      fieldInfos,
    };

    return {
      type: "cluster",
      popupTemplate,
      labelingInfo,
      clusterMinSize,

      fields,
      renderer,
    };
  }

  // Query con la información a Community Builders

  const parametrosQueryInfoCommunity = new Query({
    where: "Miniatura IS NOT NULL",
    outFields: [
      "NAMEUNIT",
      "Comunidad",
      "Tipo_de_eventos",
      "Tipo_de_comunidad",
      "Miniatura",
    ],
  });

  communityBuildersFl
    .queryFeatures(parametrosQueryInfoCommunity)
    .then((results) => {
      results.features.map((comunidadFeature) => {
        comunidades.push({
          Comunidad: comunidadFeature.attributes.Comunidad,
          NAMEUNIT: comunidadFeature.attributes.NAMEUNIT,
          TipoEvento: comunidadFeature.attributes.Tipo_de_eventos,
          TipoComunidad: comunidadFeature.attributes.Tipo_de_comunidad,
          Miniatura: comunidadFeature.attributes.Miniatura,
        });
      });
    });
  mapa.addMany([communityBuildersFl, provinciasFl]);

  // Cuando se carga esta capa se hace la llamada

  vista.whenLayerView(provinciasFl).then(() => {
    // Query a la capa de Provincias

    provinciasFl.queryFeatures().then((results) => {
      // Guardo las entidades y guardo todos los centroides de las provincias en el array de centroides

      const resultadoFeatures = results.features;
      console.log(resultadoFeatures);
      resultadoFeatures.map((entidad) => {
        centroides.push({
          center: entidad.geometry.extent.center,
          NAMEUNIT: entidad.attributes.NAMEUNIT,
        });
      });
    });
  });

  // Función que me crea el div del centroide

  function crearElementoPopUpCentroide(centro) {
    // Creo un elemento div con className popup-centroide y lo centro

    const divPopup = document.createElement("div");
    divPopup.className = "popup-centroide";
    divPopup.id = centro.NAMEUNIT;
    divPopup.style.left = `${centro.center.x - 100 / 2}px`;
    divPopup.style.top = `${centro.center.y - 75 / 2}px`;
    const parentNode = document.getElementById("mapaDiv");
    document.body.insertBefore(divPopup, parentNode);
  }

  function moverElementoPopUpCentroide(centro) {
    // Selecciono los divs con centroide  y los muevo centro

    const elementos = document.querySelectorAll(".popup-centroide");
    elementos.forEach((elemento) => {
      if (elemento.id === centro.NAMEUNIT) {
        elemento.style.left = `${centro.center.x - 100 / 2}px`;
        elemento.style.top = `${centro.center.y - 75 / 2}px`;
      }
    });
  }

  function anadirInformacionPopup() {
    const elementosPopup = document.querySelectorAll(".popup-centroide");

    // Por cada Popup, filtro las comunidades cuya NAMEUNIT coincidan con el ID del elemento
    // Creo una imagen con cada comunidad de la provincia y la añado al popup

    elementosPopup.forEach((elemento) => {
      const comunidadesProvincia = comunidades.filter(
        (comunidad) => comunidad.NAMEUNIT === elemento.id
      );

      comunidadesProvincia.forEach((comunidad) => {
        const imagen = document.createElement("img");
        imagen.className = "imagen-miniatura";
        imagen.id = comunidad.TipoComunidad.replace(/\s/g, "");
        imagen.src = comunidad.Miniatura;

        // TODO: Crear los eventos para mostrar la información de cada uno de las comunidades

        if (elemento.childElementCount < 10) {
          elemento.appendChild(imagen);
        }
      });
    });
  }

  // Creo un evento en el extent de la vista, es decir cuando la propiedad del extent de la vista cambie se ejecuta la funcion.

  reactiveUtils.watch(
    () => vista.zoom,
    (zoom) => {
      const elements = document.querySelectorAll(".popup-centroide");

      if (zoom > 6 && elements.length === 0) {
        centroidesTransformados = centroides.map((centroide) => {
          return {
            center: vista.toScreen(centroide.center),
            NAMEUNIT: centroide.NAMEUNIT,
          };
        });

        // Para cada uno de los centroides transformados creo un elemento PopUpCentroide

        centroidesTransformados.map((centro) => {
          crearElementoPopUpCentroide(centro);
        });

        anadirInformacionPopup();
      }
    }
  );

  reactiveUtils.watch(
    () => vista.extent,
    () => {
      if (vista.zoom <= 6) {
        communityBuildersFl.visible = true;
      } else {
        communityBuildersFl.visible = false;
      }

      if (vista.zoom <= 6) {
        const elementos = document.querySelectorAll(".popup-centroide");
        elementos.forEach((elemento) => {
          elemento.remove();
        });
      }

      // Para cada uno de los centroides de las provincias, calculo el centroide en la vista y los guardo en centroides transformados

      centroidesTransformados = centroides.map((centroide) => {
        return {
          center: vista.toScreen(centroide.center),
          NAMEUNIT: centroide.NAMEUNIT,
        };
      });

      // Para cada uno de los centroides transformados creo un elemento PopUpCentroide

      centroidesTransformados.map((centro) => {
        moverElementoPopUpCentroide(centro);
      });
    }
  );
});
