import { css } from "lit";

export const loadingStyles = css`
  .initial-loading {
    align-items: center;
    box-sizing: border-box;
    color: var(--primary-text-color);
    display: flex;
    gap: 12px;
    justify-content: center;
    min-height: 120px;
    padding: 24px;
  }

  .initial-loading-logo {
    display: block;
    flex: 0 0 40px;
    height: 40px;
    object-fit: contain;
    width: 40px;
  }

  .initial-loading-copy {
    display: grid;
    gap: 2px;
  }

  .initial-loading-copy strong {
    font-size: 16px;
    line-height: 1.2;
  }

  .initial-loading-copy span {
    color: var(--secondary-text-color);
    font-size: 13px;
    line-height: 1.3;
  }
`;
