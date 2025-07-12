// hooks/useOutsideClick.js
import { useEffect, useRef } from 'react';

const useOutsideClick = (callback) => {
    const ref = useRef();

    useEffect(() => {
        const handleClick = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                callback();
            }
        };

        // On écoute les clics et les "touches" sur l'écran
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('touchstart', handleClick);

        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('touchstart', handleClick);
        };
    }, [callback]); // L'effet se redéclenchera si la fonction de callback change

    return ref;
};

export default useOutsideClick;