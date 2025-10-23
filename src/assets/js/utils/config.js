/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */

const pkg = require('../package.json');
const nodeFetch = require("node-fetch");
const convert = require('xml-js');
let url = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url

let config = `${url}/launcher/config-launcher/config.json`;
let news = `${url}/launcher/news-launcher/news.json`;

class Config {
    GetConfig() {
        return new Promise((resolve, reject) => {
            nodeFetch(config).then(async config => {
                if (config.status === 200) return resolve(config.json());
                else return reject({ error: { code: config.statusText, message: 'server not accessible' } });
            }).catch(error => {
                // Gestion améliorée des erreurs réseau (comme ECONNRESET)
                if (typeof error === 'string') {
                    const networkError = new Error(error);
                    networkError.name = 'NetworkError';
                    return reject({ error: networkError });
                }
                return reject({ error });
            })
        })
    }

    async getInstanceList() {
        let urlInstance = `${url}/files`
        let instances;

        try {
            const res = await nodeFetch(urlInstance);
            
            // 1. Vérification du statut HTTP
            if (res.status !== 200) {
                // Lève une erreur si la réponse n'est pas OK
                throw new Error(`Erreur HTTP: ${res.status} - ${res.statusText}`);
            }
            
            // 2. Tente de parser le JSON
            instances = await res.json();
            
        } catch (err) {
            // CATCH (L'ERREUR CRITIQUE EST ICI)
            
            let errorObj = err;

            // Si l'erreur est une string (ex: "request to... ECONNRESET"), on la convertit en objet Error
            if (typeof err === 'string') {
                errorObj = new Error(err);
                errorObj.name = 'NetworkError (ECONNRESET)';
            }
            
            // Log l'erreur pour le développeur dans la console Node.js
            console.error("Erreur critique lors de la récupération des instances:", errorObj);
            
            // On rejette l'erreur, ce qui arrête l'exécution de la fonction
            throw errorObj;
        }
        
        // 3. Validation de l'objet instances
        if (!instances || typeof instances !== 'object') {
            console.error("Les données reçues ne sont pas un objet valide:", instances);
            throw new Error("Impossible de décoder la liste des instances.");
        }

        let instancesList = []
        // On ne fait Object.entries(instances) que si 'instances' est valide
        instances = Object.entries(instances)

        for (let [name, data] of instances) {
            let instance = data
            // C'est maintenant sûr de manipuler 'instance' car nous avons validé 'instances'
            instance.name = name
            instancesList.push(instance)
        }
        return instancesList
    }

    async getNews() {
        let config = await this.GetConfig() || {}

        if (config.rss) {
            return new Promise((resolve, reject) => {
                nodeFetch(config.rss).then(async config => {
                    if (config.status === 200) {
                        let news = [];
                        let response = await config.text()
                        response = (JSON.parse(convert.xml2json(response, { compact: true })))?.rss?.channel?.item;

                        if (!Array.isArray(response)) response = [response];
                        for (let item of response) {
                            news.push({
                                title: item.title._text,
                                content: item['content:encoded']._text,
                                author: item['dc:creator']._text,
                                publish_date: item.pubDate._text
                            })
                        }
                        return resolve(news);
                    }
                    else return reject({ error: { code: config.statusText, message: 'server not accessible' } });
                }).catch(error => {
                    // Gestion des erreurs réseau
                    if (typeof error === 'string') {
                        const networkError = new Error(error);
                        networkError.name = 'NetworkError';
                        return reject({ error: networkError });
                    }
                    return reject({ error });
                })
            })
        } else {
            return new Promise((resolve, reject) => {
                nodeFetch(news).then(async config => {
                    if (config.status === 200) return resolve(config.json());
                    else return reject({ error: { code: config.statusText, message: 'server not accessible' } });
                }).catch(error => {
                    // Gestion des erreurs réseau
                    if (typeof error === 'string') {
                        const networkError = new Error(error);
                        networkError.name = 'NetworkError';
                        return reject({ error: networkError });
                    }
                    return reject({ error });
                })
            })
        }
    }
}

export default new Config;