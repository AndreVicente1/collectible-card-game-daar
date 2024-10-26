// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Booster is ERC721URIStorage, Ownable {
    string public boosterName;
    bool public isOpened;
    uint256 public collectionId;

    address public mainContract;
    uint256 public boosterId;

    event BoosterCreated(uint256 indexed boosterId, string boosterName, uint256 collectionId, address owner);

    constructor(string memory _name, uint256 _collectionId, uint256 _boosterId, address recip, address _mainContract) ERC721("Booster", "BST") Ownable(recip){
        boosterId = _boosterId;
        boosterName = _name;
        collectionId = _collectionId;
        isOpened = false;
        mainContract = _mainContract;
        
        _mint(recip, boosterId);
        console.log('owner is', owner());
        emit BoosterCreated(boosterId, boosterName, collectionId, recip);
    }

    // Function to open a booster
    function openBooster() external onlyAuthorized {
        
        require(!isOpened, "Booster already opened");

        isOpened = true;

        _burn(boosterId);
    }  

    modifier onlyAuthorized() {
        require(msg.sender == owner() || msg.sender == mainContract, "Not authorized");
        _;
    }
}
