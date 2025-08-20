// src/serviceWorkerRegistration.js

const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    // [::1] est l'adresse IPv6 de localhost.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 est considéré comme localhost pour IPv4.
    window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function register(config) {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
        // L'URL du constructeur est relative au fichier
        // dans lequel il est appelé.
        const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
        if (publicUrl.origin !== window.location.origin) {
            // Notre service worker ne fonctionnera pas si PUBLIC_URL est sur une
            // origine différente d'où la page est servie. Cela pourrait se produire
            // si un CDN est utilisé pour servir des assets.
            return;
        }

        window.addEventListener('load', () => {
            const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

            if (isLocalhost) {
                // Cela s'exécute sur localhost. Vérifions si un service worker existe encore
                // ou non.
                checkValidServiceWorker(swUrl, config);

                // Ajoutez des logs supplémentaires vers la console des développeurs sur localhost
                navigator.serviceWorker.ready.then(() => {
                    console.log(
                        'This web app is being served cache-first by a service ' +
                        'worker. To learn more, visit https://cra.link/PWA'
                    );
                });
            } else {
                // N'est pas localhost, enregistre le service worker de production
                registerValidSW(swUrl, config);
            }
        });
    }
}

function registerValidSW(swUrl, config) {
    navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
            registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                if (installingWorker == null) {
                    return;
                }
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            // À ce stade, le contenu mis en cache a été mis à jour, mais
                            // le Service Worker précédent servira toujours l'ancien contenu
                            // jusqu'à ce que toutes les fenêtres client aient été fermées.
                            console.log(
                                'New content is available and will be used when all ' +
                                'tabs for this page are closed. See https://cra.link/PWA.'
                            );

                            // Exécute la fonction `onUpdate` fournie par l'utilisateur
                            if (config && config.onUpdate) {
                                config.onUpdate(registration);
                            }
                        } else {
                            // À ce stade, tout a été pré-mis en cache.
                            // C'est le moment idéal pour afficher un message
                            // "Le contenu est mis en cache pour une utilisation hors ligne".
                            console.log('Content is cached for offline use.');

                            // Exécute la fonction `onSuccess` fournie par l'utilisateur
                            if (config && config.onSuccess) {
                                config.onSuccess(registration);
                            }
                        }
                    }
                };
            };
        })
        .catch((error) => {
            console.error('Error during service worker registration:', error);
        });
}

function checkValidServiceWorker(swUrl, config) {
    // Vérifie si le service worker peut être trouvé. Si ce n'est pas le cas, recharge la page.
    fetch(swUrl, {
        headers: { 'Service-Worker': 'script' },
    })
        .then((response) => {
            // S'assure que le service worker existe, et que le type de contenu
            // est bien un JavaScript.
            const contentType = response.headers.get('content-type');
            if (
                response.status === 404 ||
                (contentType != null && contentType.indexOf('javascript') === -1)
            ) {
                // Aucun service worker trouvé. Probablement une application différente. Recharge la page.
                navigator.serviceWorker.ready.then((registration) => {
                    registration.unregister().then(() => {
                        window.location.reload();
                    });
                });
            } else {
                // Service worker trouvé. Procéder normalement.
                registerValidSW(swUrl, config);
            }
        })
        .catch(() => {
            console.log(
                'No internet connection found. App is running in offline mode.'
            );
        });
}

export function unregister() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
            .then((registration) => {
                registration.unregister();
            })
            .catch((error) => {
                console.error(error.message);
            });
    }
}