'use client';

import { Item, Masonry } from './mansory';

interface OneGameContentProps {
    name: string;
    items: Item[];
}

const games = [
    {
        name: 'Elden Ring',
        items: [
            { id: '0', img: '/images/hobbies/games/eldenring/0.gif', url: '#', height: 300 },
            { id: '1', img: '/images/hobbies/games/eldenring/1.gif', url: '#', height: 360 },
            { id: '2', img: '/images/hobbies/games/eldenring/2.gif', url: '#', height: 240 },
            { id: '3', img: '/images/hobbies/games/eldenring/3.gif', url: '#', height: 420 },
            { id: '4', img: '/images/hobbies/games/eldenring/4.gif', url: '#', height: 300 },
            { id: '5', img: '/images/hobbies/games/eldenring/5.gif', url: '#', height: 280 },
            { id: '6', img: '/images/hobbies/games/eldenring/6.gif', url: '#', height: 340 },
            { id: '7', img: '/images/hobbies/games/eldenring/7.gif', url: '#', height: 260 },
            { id: '8', img: '/images/hobbies/games/eldenring/8.gif', url: '#', height: 400 },
            { id: '9', img: '/images/hobbies/games/eldenring/9.gif', url: '#', height: 320 },
            { id: '10', img: '/images/hobbies/games/eldenring/10.gif', url: '#', height: 280 },
            { id: '11', img: '/images/hobbies/games/eldenring/11.gif', url: '#', height: 260 },
        ],
    },
];

export function GameContent() {
    return (
        <div className="w-full h-[1000px] flex flex-col gap-12 px-4 py-10 max-w-6xl mx-auto">
            {games.map((game) => (
                <OneGameContent key={game.name} {...game} />
            ))}
        </div>
    );
}

function OneGameContent({ name, items }: OneGameContentProps) {
    return (
        <div className="w-full flex flex-col gap-6">
            <h1 className="text-4xl font-bold text-center">{name}</h1>
            <Masonry
                items={items}
                ease="power3.out"
                duration={0.6}
                stagger={0.05}
                animateFrom="bottom"
                scaleOnHover={true}
                hoverScale={0.95}
                blurToFocus={true}
                colorShiftOnHover={false}
            />
        </div>
    );
}
