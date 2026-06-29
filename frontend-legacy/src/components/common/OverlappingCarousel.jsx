import React from 'react';

const OverlappingCarousel = ({ posters = [], className = "" }) => {
    // 5 slots in total
    const slots = [null, null, null, null, null];

    // Place posters from right to left (newest on the far right)
    // If posters[0] is newest, it goes to slots[4].
    for (let i = 0; i < posters.length && i < 5; i++) {
        slots[4 - i] = posters[i];
    }

    return (
        <div className={`relative flex items-center justify-center h-full w-full ${className}`}>
            <div className="relative flex items-center justify-center hover:brightness-80 transition-all duration-300">
                {slots.map((poster, index) => {
                    const zIndex = index + 1;

                    return (
                        <div
                            key={index}
                            className={`
                                relative 
                                w-[66px] h-[99px] md:w-[88px] md:h-[132px]
                                rounded-lg
                                border border-white/10
                                overflow-hidden
                                transition-all duration-300 ease-out
                                shadow-md
                                ${index !== 0 ? '-ml-[33px] md:-ml-[44px]' : ''}
                            `}
                            style={{
                                zIndex: zIndex,
                                backgroundColor: '#1f1f1f',
                            }}
                        >
                            {poster ? (
                                <img
                                    src={`https://image.tmdb.org/t/p/w300${poster}`}
                                    alt="List item"
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-full h-full bg-white/[0.02]" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OverlappingCarousel;
