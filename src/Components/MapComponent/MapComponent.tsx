import React, { useEffect, useState, useRef } from "react";
import "@arcgis/map-components/components/arcgis-map";
// import Map from "@arcgis/core/Map.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";
import * as pieChartRendererCreator from "@arcgis/core/smartMapping/renderers/pieChart.js";
import * as clusterLabelCreator from "@arcgis/core/smartMapping/labels/clusters.js";
import Query from "@arcgis/core/rest/support/Query.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import MapView from "@arcgis/core/views/MapView";
import Popup from "@arcgis/core/widgets/Popup.js";



// @import "https://js.arcgis.com/4.32/@arcgis/core/assets/esri/themes/light/main.css";



// Variables globales

const centroides: [] = [];
let centroidesTransformados;
const comunidades: [] = [];


const MapComponent: React.FC = () => {
    const [screenSize, setScreenSize] = useState<[number, number]>([0, 0]);
    const popupRef = useRef<Popup>(null); // Store the Popup instance

    useEffect(() => {
        // Ensure this runs on client-side
        if (typeof window !== "undefined") {
            const body = document.body; // Directly get the body element
            setScreenSize([body.clientWidth, body.clientHeight]);

            // Handle window resize
            const handleResize = () => {
                setScreenSize([body.clientWidth, body.clientHeight]);
            };

            window.addEventListener("resize", handleResize);
            return () => window.removeEventListener("resize", handleResize);
        }
    }, []);

    const arcgisMap = document.querySelector("arcgis-map");

    async function generarConfiguracionCluster (layer: FeatureLayer, view: MapView) {
        // Genera la labelingInfo default

        const { labelingInfo, clusterMinSize } = await clusterLabelCreator
            .getLabelSchemes({ layer, view })
            .then((labelSchemes) => labelSchemes?.primaryScheme);

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

    arcgisMap?.addEventListener("arcgisViewReadyChange", () => {
        // to be implemented
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
            generarConfiguracionCluster(communityBuildersFl, arcgisMap.view).then(
                (featureReduction) => {
                    communityBuildersFl.featureReduction = featureReduction;
                }
            );
        });

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
        arcgisMap.map.addMany([communityBuildersFl, provinciasFl]);



        // Cuando se carga esta capa se hace la llamada

        arcgisMap.view.whenLayerView(provinciasFl).then(() => {
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

        function crearElementoPopUpCentroide (centro) {
            // Creo un elemento div con className popup-centroide y lo centro

            const divPopup = document.createElement("div");
            divPopup.className = "popup-centroide";
            divPopup.id = centro.NAMEUNIT;
            divPopup.style.left = `${centro.center.x - 100 / 2}px`;
            divPopup.style.top = `${centro.center.y - 75 / 2}px`;
            const parentNode = document.getElementById("mapaDiv");
            document.body.insertBefore(divPopup, parentNode);
        }

        function moverElementoPopUpCentroide (centro) {
            // Selecciono los divs con centroide  y los muevo centro

            const elementos = document.querySelectorAll(".popup-centroide");
            elementos.forEach((elemento) => {
                if (elemento.id === centro.NAMEUNIT) {
                    elemento.style.left = `${centro.center.x - 100 / 2}px`;
                    elemento.style.top = `${centro.center.y - 75 / 2}px`;
                }
            });
        }

        function abrirPopupArcGIS (comunidad) {

            console.log(popupRef)

            if (!popupRef.current) {
                popupRef.current = new Popup({
                    title: comunidad.TipoComunidad,
                    content: `
                            <div style="text-align: center;">
                                <img src="${comunidad.Miniatura}" style="width: 100%; max-width: 250px; border-radius: 10px;">
                                <p><a href="${comunidad.Website}" target="_blank" style="color: blue; text-decoration: underline;">Visit Website</a></p>
                            </div>
                        `,
                    alignment: "top-left", // Aligns the popup to the top-left corner
                });

                // Move popup to top-left via CSS
                const popupContainer = document.querySelector(".esri-popup");
                if (popupContainer) {
                    popupContainer.style.position = "absolute";
                    popupContainer.style.top = "10px";
                    popupContainer.style.left = "10px";
                    popupContainer.style.zIndex = "1000";
                }
            }

            // Open the popup without setting a map location
            popupRef.current.open();

        };

        function anadirInformacionPopup () {
            const elementosPopup = document.querySelectorAll(".popup-centroide");

            elementosPopup.forEach((elemento) => {
                const comunidadesProvincia = comunidades.filter(
                    (comunidad) => comunidad.NAMEUNIT === elemento.id
                );

                comunidadesProvincia.forEach((comunidad) => {
                    const imagen = document.createElement("img");
                    imagen.className = "imagen-miniatura";
                    imagen.id = comunidad.TipoComunidad.replace(/\s/g, "");
                    imagen.src = comunidad.Miniatura;

                    // Tooltip for hover effect
                    const tooltip = document.createElement("div");
                    tooltip.className = "popup-tooltip";
                    tooltip.innerText = comunidad.TipoComunidad;
                    tooltip.style.display = "none";
                    elemento.appendChild(tooltip);

                    // Mouse hover to show tooltip
                    imagen.addEventListener("mouseover", (event) => {
                        tooltip.style.display = "block";
                        tooltip.style.position = "absolute";
                        tooltip.style.left = `${event.offsetX + 10}px`;
                        tooltip.style.top = `${event.offsetY + 10}px`;
                    });

                    imagen.addEventListener("mouseout", () => {
                        tooltip.style.display = "none";
                    });

                    // OnClick: Open ArcGIS Popup
                    imagen.addEventListener("click", () => {
                        abrirPopupArcGIS(comunidad);
                    });

                    if (elemento.childElementCount < 10) {
                        elemento.appendChild(imagen);
                    }
                });
            });
        }






        // Creo un evento en el extent de la arcgisMap.view, es decir cuando la propiedad del extent de la arcgisMap.view cambie se ejecuta la funcion.

        reactiveUtils.watch(
            () => arcgisMap.view.zoom,
            (zoom) => {
                const elements = document.querySelectorAll(".popup-centroide");

                if (zoom > 6 && elements.length === 0) {
                    centroidesTransformados = centroides.map((centroide) => {
                        return {
                            center: arcgisMap.view.toScreen(centroide.center),
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
            () => arcgisMap.view.extent,
            () => {
                if (arcgisMap.view.zoom <= 6) {
                    communityBuildersFl.visible = true;
                } else {
                    communityBuildersFl.visible = false;
                }

                if (arcgisMap.view.zoom <= 6) {
                    const elementos = document.querySelectorAll(".popup-centroide");
                    elementos.forEach((elemento) => {
                        elemento.remove();
                    });
                }

                // Para cada uno de los centroides de las provincias, calculo el centroide en la arcgisMap.view y los guardo en centroides transformados

                centroidesTransformados = centroides.map((centroide) => {
                    return {
                        center: arcgisMap.view.toScreen(centroide.center),
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




    return (
        <>
            <arcgis-map basemap="dark-gray" center="-4, 40" zoom="5" ></arcgis-map>
        </>
    );
};

export default MapComponent;
