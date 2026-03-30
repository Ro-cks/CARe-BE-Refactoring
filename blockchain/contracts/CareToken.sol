// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice CARE 토큰 (테스트용 ERC20)
contract CareToken is ERC20, Ownable {
    constructor() ERC20("Care Token", "CARE") Ownable(msg.sender) {
        // 수정 1: msg.sender(개인 지갑)가 아니라 address(this)(컨트랙트 금고)에 1억 개를 최초 발행
        _mint(address(this), 100_000_000 * 10 ** decimals());
    }

    /// @notice 누구나 금고(컨트랙트)에 있는 CARE를 받을 수 있는 faucet
    function faucet(address to, uint256 amount) external {
        // 수정 2: 새로 찍어내는(_mint) 대신, 금고(address(this))에 있는 기존 코인을 전송(_transfer)
        _transfer(address(this), to, amount);
    }

    /// @notice 서버 관리자가 특정 지갑의 토큰을 차감
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}