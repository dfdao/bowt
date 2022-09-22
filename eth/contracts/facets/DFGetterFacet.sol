// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// External contract imports
import {DFArtifactFacet} from "./DFArtifactFacet.sol";

// Library imports
import {LibPermissions} from "../libraries/LibPermissions.sol";
import {LibGameUtils} from "../libraries/LibGameUtils.sol";

// Storage imports
import {WithStorage, SnarkConstants, GameConstants} from "../libraries/LibStorage.sol";

// Type imports
import {RevealedCoords, ArrivalData, Planet, PlanetEventType, PlanetEventMetadata, PlanetDefaultStats, PlanetData, Player, ArtifactWithMetadata, Upgrade, Artifact} from "../DFTypes.sol";

contract DFGetterFacet is WithStorage {
    // FIRST-LEVEL GETTERS - mirrors the solidity autogenerated toplevel getters, but for GameStorage
    // OMMITTED:
    // - whitelist (it's a contract)
    // - tokens (it's a contract)

    function adminAddress() public view returns (address) {
        return LibPermissions.contractOwner();
    }

    function paused() public view returns (bool) {
        return gs().paused;
    }

    function TOKEN_MINT_END_TIMESTAMP() public view returns (uint256) {
        return gs().TOKEN_MINT_END_TIMESTAMP;
    }

    function getSnarkConstants() public pure returns (SnarkConstants memory) {
        return snarkConstants();
    }

    function getGameConstants() public pure returns (GameConstants memory) {
        return gameConstants();
    }

    function planetLevelsCount() public view returns (uint256) {
        return gs().planetLevelsCount;
    }

    function worldRadius() public view returns (uint256) {
        return gs().worldRadius;
    }

    function planetEventsCount() public view returns (uint256) {
        return gs().planetEventsCount;
    }

    function planetDefaultStats(uint256 level) public view returns (PlanetDefaultStats memory) {
        return planetDefaultStats()[level];
    }

    function planetIds(uint256 idx) public view returns (uint256) {
        return gs().planetIds[idx];
    }

    function revealedPlanetIds(uint256 idx) public view returns (uint256) {
        return gs().revealedPlanetIds[idx];
    }

    function playerIds(uint256 idx) public view returns (address) {
        return gs().playerIds[idx];
    }

    function planets(uint256 key) public view returns (Planet memory) {
        return gs().planets[key];
    }

    function revealedCoords(uint256 key) public view returns (RevealedCoords memory) {
        return gs().revealedCoords[key];
    }

    function artifactIdToPlanetId(uint256 key) public view returns (uint256) {
        return gs().artifactIdToPlanetId[key];
    }

    function artifactIdToVoyageId(uint256 key) public view returns (uint256) {
        return gs().artifactIdToVoyageId[key];
    }

    function planetEvents(uint256 key) public view returns (PlanetEventMetadata[] memory) {
        return gs().planetEvents[key];
    }

    function players(address key) public view returns (Player memory) {
        return gs().players[key];
    }

    function planetArrivals(uint256 key) public view returns (ArrivalData memory) {
        return gs().planetArrivals[key];
    }

    function planetArtifacts(uint256 key) public view returns (uint256[] memory) {
        return gs().planetArtifacts[key];
    }

    // ADDITIONAL UTILITY GETTERS

    function getNPlanets() public view returns (uint256) {
        return gs().planetIds.length;
    }

    function getNRevealedPlanets() public view returns (uint256) {
        return gs().revealedPlanetIds.length;
    }

    function getNPlayers() public view returns (uint256) {
        return gs().playerIds.length;
    }

    function getPlanetEventsCount(uint256 locationId) public view returns (uint256) {
        return gs().planetEvents[locationId].length;
    }

    function getPlanetEvent(uint256 locationId, uint256 idx)
        public
        view
        returns (PlanetEventMetadata memory)
    {
        return gs().planetEvents[locationId][idx];
    }

    function getPlanetArrival(uint256 arrivalId) public view returns (ArrivalData memory) {
        return gs().planetArrivals[arrivalId];
    }

    function getRevealedCoords(uint256 locationId) public view returns (RevealedCoords memory) {
        return gs().revealedCoords[locationId];
    }

    function getUpgrades() public pure returns (Upgrade[4][3] memory) {
        return upgrades();
    }

    function getTypeWeights() public view returns (uint8[5][10][4] memory) {
        return gameConstants().PLANET_TYPE_WEIGHTS;
    }

    function getPlayerSpaceJunkLimit(address playerId) public view returns (uint256) {
        return gs().players[playerId].spaceJunkLimit;
    }

    function getArtifactPointValues() public view returns (uint256[6] memory) {
        return gameConstants().ARTIFACT_POINT_VALUES;
    }

    function getRevealCooldown() public view returns (uint256) {
        return gameConstants().LOCATION_REVEAL_COOLDOWN;
    }

    function getDefaultStats() public pure returns (PlanetDefaultStats[] memory) {
        return planetDefaultStats();
    }

    function getCumulativeRarities() public view returns (uint256[] memory) {
        return gs().cumulativeRarities;
    }

    function bulkGetPlanetIds(uint256 startIdx, uint256 endIdx)
        public
        view
        returns (uint256[] memory ret)
    {
        // return slice of planetIds array from startIdx through endIdx - 1
        ret = new uint256[](endIdx - startIdx);
        for (uint256 i = startIdx; i < endIdx; i++) {
            ret[i - startIdx] = gs().planetIds[i];
        }
    }

    function bulkGetRevealedPlanetIds(uint256 startIdx, uint256 endIdx)
        public
        view
        returns (uint256[] memory ret)
    {
        // return slice of revealedPlanetIds array from startIdx through endIdx - 1
        ret = new uint256[](endIdx - startIdx);
        for (uint256 i = startIdx; i < endIdx; i++) {
            ret[i - startIdx] = gs().revealedPlanetIds[i];
        }
    }

    function bulkGetPlanetsByIds(uint256[] calldata ids) public view returns (Planet[] memory ret) {
        ret = new Planet[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            ret[i] = gs().planets[ids[i]];
        }
    }

    function bulkGetRevealedCoordsByIds(uint256[] calldata ids)
        public
        view
        returns (RevealedCoords[] memory ret)
    {
        ret = new RevealedCoords[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            ret[i] = gs().revealedCoords[ids[i]];
        }
    }

    function bulkGetPlanetArrivalsByIds(uint256[] calldata ids)
        public
        view
        returns (ArrivalData[][] memory)
    {
        ArrivalData[][] memory ret = new ArrivalData[][](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            ret[i] = getPlanetArrivals(ids[i]);
        }

        return ret;
    }

    function bulkGetPlanetsDataByIds(uint256[] calldata ids)
        public
        view
        returns (PlanetData[] memory ret)
    {
        ret = new PlanetData[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            ret[i] = PlanetData({
                planet: gs().planets[ids[i]],
                revealedCoords: gs().revealedCoords[ids[i]]
            });
        }
    }

    function bulkGetVoyagesByIds(uint256[] calldata ids)
        public
        view
        returns (ArrivalData[] memory ret)
    {
        ret = new ArrivalData[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            ret[i] = gs().planetArrivals[ids[i]];
        }
    }

    function bulkGetPlanets(uint256 startIdx, uint256 endIdx)
        public
        view
        returns (Planet[] memory ret)
    {
        // return array of planets corresponding to planetIds[startIdx] through planetIds[endIdx - 1]
        ret = new Planet[](endIdx - startIdx);
        for (uint256 i = startIdx; i < endIdx; i++) {
            ret[i - startIdx] = gs().planets[gs().planetIds[i]];
        }
    }

    function bulkGetPlayerIds(uint256 startIdx, uint256 endIdx)
        public
        view
        returns (address[] memory ret)
    {
        // return slice of players array from startIdx through endIdx - 1
        ret = new address[](endIdx - startIdx);
        for (uint256 i = startIdx; i < endIdx; i++) {
            ret[i - startIdx] = gs().playerIds[i];
        }
    }

    function bulkGetPlayers(uint256 startIdx, uint256 endIdx)
        public
        view
        returns (Player[] memory ret)
    {
        // return array of planets corresponding to planetIds[startIdx] through planetIds[endIdx - 1]
        ret = new Player[](endIdx - startIdx);
        for (uint256 i = startIdx; i < endIdx; i++) {
            ret[i - startIdx] = gs().players[gs().playerIds[i]];
        }
    }

    function getPlanetArrivals(uint256 _location) public view returns (ArrivalData[] memory ret) {
        uint256 arrivalCount = 0;
        for (uint256 i = 0; i < getPlanetEventsCount(_location); i += 1) {
            if (getPlanetEvent(_location, i).eventType == PlanetEventType.ARRIVAL) {
                arrivalCount += 1;
            }
        }
        ret = new ArrivalData[](arrivalCount);

        for (uint256 i = 0; i < getPlanetEventsCount(_location); i += 1) {
            PlanetEventMetadata memory arrivalEvent = getPlanetEvent(_location, i);

            if (arrivalEvent.eventType == PlanetEventType.ARRIVAL) {
                ret[i] = gs().planetArrivals[arrivalEvent.id];
            }
        }
    }

    function bulkGetPlanetArrivals(uint256 startIdx, uint256 endIdx)
        public
        view
        returns (ArrivalData[][] memory)
    {
        // return array of planets corresponding to planetIds[startIdx] through planetIds[endIdx - 1]

        ArrivalData[][] memory ret = new ArrivalData[][](endIdx - startIdx);

        for (uint256 i = startIdx; i < endIdx; i++) {
            ret[i - startIdx] = getPlanetArrivals(gs().planetIds[i]);
        }

        return ret;
    }

    function getArtifactById(uint256 artifactId)
        public
        view
        returns (ArtifactWithMetadata memory ret)
    {
        Artifact memory artifact = DFArtifactFacet(address(this)).getArtifact(artifactId);

        address owner;

        try DFArtifactFacet(address(this)).ownerOf(artifact.id) returns (address addr) {
            owner = addr;
        } catch Error(string memory) {
            // artifact is probably burned / owned by 0x0, so owner is 0x0
        } catch (bytes memory) {
            // this shouldn't happen
        }

        ret = ArtifactWithMetadata({
            artifact: artifact,
            upgrade: LibGameUtils._getUpgradeForArtifact(artifact),
            timeDelayedUpgrade: LibGameUtils.timeDelayUpgrade(artifact),
            owner: owner,
            locationId: gs().artifactIdToPlanetId[artifact.id],
            voyageId: gs().artifactIdToVoyageId[artifact.id]
        });
    }

    function getArtifactsOnPlanet(uint256 locationId)
        public
        view
        returns (ArtifactWithMetadata[] memory ret)
    {
        uint256[] memory artifactIds = gs().planetArtifacts[locationId];
        ret = new ArtifactWithMetadata[](artifactIds.length);
        for (uint256 i = 0; i < artifactIds.length; i++) {
            ret[i] = getArtifactById(artifactIds[i]);
        }
        return ret;
    }

    function bulkGetPlanetArtifacts(uint256[] calldata planetIds)
        public
        view
        returns (ArtifactWithMetadata[][] memory)
    {
        ArtifactWithMetadata[][] memory ret = new ArtifactWithMetadata[][](planetIds.length);

        for (uint256 i = 0; i < planetIds.length; i++) {
            uint256[] memory planetOwnedArtifactIds = gs().planetArtifacts[planetIds[i]];
            ret[i] = bulkGetArtifactsByIds(planetOwnedArtifactIds);
        }

        return ret;
    }

    function bulkGetArtifactsByIds(uint256[] memory ids)
        public
        view
        returns (ArtifactWithMetadata[] memory ret)
    {
        ret = new ArtifactWithMetadata[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            Artifact memory artifact = DFArtifactFacet(address(this)).getArtifact(ids[i]);

            address owner;

            try DFArtifactFacet(address(this)).ownerOf(artifact.id) returns (address addr) {
                owner = addr;
            } catch Error(string memory) {
                // artifact is probably burned or owned by 0x0, so owner is 0x0
            } catch (bytes memory) {
                // this shouldn't happen
            }

            ret[i] = ArtifactWithMetadata({
                artifact: artifact,
                upgrade: LibGameUtils._getUpgradeForArtifact(artifact),
                timeDelayedUpgrade: LibGameUtils.timeDelayUpgrade(artifact),
                owner: owner,
                locationId: gs().artifactIdToPlanetId[artifact.id],
                voyageId: gs().artifactIdToVoyageId[artifact.id]
            });
        }
    }

    /**
     * Get a group or artifacts based on their index, fetch all between startIdx & endIdx.
     Indexes are assigned to artifacts based on the order in which they are minted.
     * index 0 would be the first Artifact minted, etc.
     * @param startIdx index of the first element to get
     * @param endIdx index of the last element to get
     */
    function bulkGetArtifacts(uint256 startIdx, uint256 endIdx)
        public
        view
        returns (ArtifactWithMetadata[] memory ret)
    {
        ret = new ArtifactWithMetadata[](endIdx - startIdx);

        for (uint256 i = startIdx; i < endIdx; i++) {
            Artifact memory artifact = DFArtifactFacet(address(this)).getArtifactAtIndex(i);
            address owner = address(0);

            try DFArtifactFacet(address(this)).ownerOf(artifact.id) returns (address addr) {
                owner = addr;
            } catch Error(string memory) {
                // artifact is probably burned or owned by 0x0, so owner is 0x0
            } catch (bytes memory) {
                // this shouldn't happen
            }
            ret[i - startIdx] = ArtifactWithMetadata({
                artifact: artifact,
                upgrade: LibGameUtils._getUpgradeForArtifact(artifact),
                timeDelayedUpgrade: LibGameUtils.timeDelayUpgrade(artifact),
                owner: owner,
                locationId: gs().artifactIdToPlanetId[artifact.id],
                voyageId: gs().artifactIdToVoyageId[artifact.id]
            });
        }
    }
}
