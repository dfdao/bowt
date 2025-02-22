// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// Contract imports
import {DFDiamond} from "../DFDiamond.sol";

// Interface imports
import {IERC173} from "@solidstate/contracts/access/IERC173.sol";
import {IDiamondReadable} from "@solidstate/contracts/proxy/diamond/readable/IDiamondReadable.sol";
import {IDiamondWritable} from "@solidstate/contracts/proxy/diamond/writable/IDiamondWritable.sol";

// Storage imports
import {WithStorage} from "../libraries/LibStorage.sol";

contract DFLobbyFacet is WithStorage {
    event LobbyCreated(address ownerAddress, address lobbyAddress);

    /**
     * @notice create new diamond with facets from parent diamond
     *  and optionally execute arbitrary initialization function
     * @param initAddress optional target of initialization delegatecall
     * @param initData optional initialization function call data
     */
    function createLobby(address initAddress, bytes calldata initData) public {
        address diamondAddress = gs().diamondAddress;
        DFDiamond lobby = new DFDiamond();

        IDiamondReadable.Facet[] memory facets = IDiamondReadable(diamondAddress).facets();

        // Memory arrays can't be dynamic, so count how many built-in cuts the diamond provides
        // then use that length to make the correctly sized facetCut array below
        // This is also hardened against the Diamond doing multiple cuts for selectors it provides
        uint256 builtinLength = 0;
        for (uint256 i = 0; i < facets.length; i++) {
            if (facets[i].target == diamondAddress) {
                builtinLength++;
            }
        }

        // TODO: Do we need this?
        require(
            builtinLength <= facets.length,
            "Built-in facets cannot be greater than total cuts"
        );

        IDiamondWritable.FacetCut[] memory facetCut = new IDiamondWritable.FacetCut[](
            facets.length - builtinLength
        );
        uint256 cutIdx = 0;
        for (uint256 i = 0; i < facets.length; i++) {
            if (facets[i].target != diamondAddress) {
                facetCut[cutIdx] = IDiamondWritable.FacetCut({
                    target: facets[i].target,
                    action: IDiamondWritable.FacetCutAction.ADD,
                    selectors: facets[i].selectors
                });
                cutIdx++;
            }
        }

        IDiamondWritable(address(lobby)).diamondCut(facetCut, initAddress, initData);

        IERC173(address(lobby)).transferOwnership(msg.sender);

        emit LobbyCreated(msg.sender, address(lobby));
    }
}
