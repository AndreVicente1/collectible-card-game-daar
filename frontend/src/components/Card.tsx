import React from 'react';
import '../css/Card.css';

interface CardProps {
  card: {
    id: number;
    name: string;
    type: string;
    set: {
      name: string;
      slug: string;
    };
    rarity: string;
    description: string;
    image: string;
    attributes: Array<{
      trait_type: string;
      value: string;
    }>;
  };
}

const Card = ({ card }: CardProps) => {
  return (
    <div className="card">
      <img src={card.image} alt={card.name} className="card-image" />
      <div className="card-details">
        <h2 className="card-name">{card.name}</h2>
        <p className="card-type"><strong>Type:</strong> {card.type}</p>
        <p className="card-set"><strong>Set:</strong> {card.set.name}</p>
        <p className="card-rarity"><strong>Rarity:</strong> {card.rarity}</p>
        <p className="card-description">{card.description}</p>
        <div className="card-attributes">
          {card.attributes.map((attr, index) => (
            <div key={index} className="attribute">
              <span className="trait-type">{attr.trait_type}:</span>
              <span className="value">{attr.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Card;