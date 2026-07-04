import React, { useState } from 'react';
import { BookOpen, Layers, Cpu, Award, ShieldCheck, Zap, AlertTriangle, Lock, Key, Clock, RefreshCw, Database, Eye, Server, Swords, Info } from 'lucide-react';
import { SoundFX } from '../components/SoundFXController';

type Tab = 'OVERVIEW' | 'LEVELS' | 'CARDS' | 'COMPONENTS';

const LEVEL_DATA = [
  {
    id: 'level_valid_transaction',
    num: 1,
    title: 'Giao Dịch Hợp Lệ',
    attackType: 'NONE',
    difficulty: 'DỄ',
    color: 'text-neon-green',
    emoji: '🟢',
    diffColor: 'text-neon-green',
    scenario: 'Giao dịch chuyển khoản thông thường từ Alice sang Bob được thực hiện trong môi trường mạng an toàn, không phát hiện sự can thiệp hay tấn công từ Attacker.',
    cards: 'Chữ ký số, Secure Audit Log (Có thể thêm AES-GCM)',
    hint: 'Màn làm quen (tutorial) — hãy trang bị "Chữ ký số" và "Secure Audit Log". Có thể chọn thêm "AES-GCM" để nâng cao bảo mật.',
    pts: 100,
  },
  {
    id: 'level_amount_tampering',
    num: 2,
    title: 'Số Tiền Bị Sửa (Tampering)',
    attackType: 'AMOUNT_TAMPERING',
    difficulty: 'TRUNG BÌNH',
    color: 'text-neon-amber',
    emoji: '🟡',
    diffColor: 'text-neon-amber',
    scenario: 'Hacker chặn gói tin giữa chừng và sửa đổi số tiền giao dịch từ 1 triệu lên 100 triệu VND hòng rút ruột tài khoản. Hacker không có khóa riêng của Alice.',
    cards: 'Chữ ký số',
    hint: 'Chữ ký số RSA-PSS bao phủ toàn bộ payload của Alice. Bất kỳ sự thay đổi số tiền nào sẽ làm chữ ký lệch và bị máy chủ từ chối lập tức.',
    pts: 100,
  },
  {
    id: 'level_replay_transaction',
    num: 3,
    title: 'Replay Giao Dịch Cũ',
    attackType: 'REPLAY',
    difficulty: 'TRUNG BÌNH',
    color: 'text-neon-amber',
    emoji: '🟡',
    diffColor: 'text-neon-amber',
    scenario: 'Hacker chụp gói tin giao dịch cũ hợp lệ rồi phát lại (Replay Attack) nguyên vẹn lên ngân hàng nhiều lần để rút trộm tiền mà không cần sửa đổi gói tin.',
    cards: 'Nonce, Timestamp/TTL, Replay Cache',
    hint: 'Trang bị bộ ba lá chắn chống Replay: "Nonce" (số dùng 1 lần), "Timestamp/TTL" (giới hạn thời gian), và "Replay Cache" (ghi nhớ các message_id đã xử lý).',
    pts: 100,
  },
  {
    id: 'level_invalid_signature',
    num: 4,
    title: 'Giả Mạo Chữ Ký',
    attackType: 'INVALID_SIGNATURE',
    difficulty: 'TRUNG BÌNH',
    color: 'text-neon-amber',
    emoji: '🟡',
    diffColor: 'text-neon-amber',
    scenario: 'Hacker tự tạo một cặp khóa RSA giả mạo và dùng khóa riêng giả này để ký số lên giao dịch giả mạo, mạo danh chữ ký hợp lệ của Alice.',
    cards: 'Chữ ký số, Key Fingerprint',
    hint: 'Dùng "Key Fingerprint" đối chiếu dấu vân tay định danh của khóa công khai với Registry ngân hàng để phát hiện và bác bỏ khóa giả lập.',
    pts: 100,
  },
  {
    id: 'level_wrong_key',
    num: 5,
    title: 'Dùng Sai Khóa Mã Hóa',
    attackType: 'WRONG_KEY',
    difficulty: 'KHÓ',
    color: 'text-neon-pink',
    emoji: '🔴',
    diffColor: 'text-neon-pink',
    scenario: 'Lỗi cấu hình hoặc hacker phá hoại chèn một key_id mã hóa đối xứng hoàn toàn sai lệch hoặc đã hết hạn để giải mã gói tin AEAD.',
    cards: 'AES-GCM, Key Fingerprint',
    hint: 'Chọn "AES-GCM" giải mã có xác thực để báo lỗi tag khi giải mã sai, và "Key Fingerprint" đối chiếu định danh khóa đối xứng trong Registry.',
    pts: 100,
  },
  {
    id: 'level_recipient_tampering',
    num: 6,
    title: 'Can Thiệp Tài Khoản Nhận',
    attackType: 'AMOUNT_TAMPERING',
    difficulty: 'DỄ',
    color: 'text-neon-green',
    emoji: '🟢',
    diffColor: 'text-neon-green',
    scenario: 'Hacker can thiệp thay đổi trường tài khoản thụ hưởng (to_account) từ tài khoản Bob sang tài khoản của hacker ngay trên đường truyền giao dịch.',
    cards: 'Chữ ký số',
    hint: 'Chữ ký số RSA-PSS bao phủ toàn bộ payload bao gồm cả tài khoản đích. Sửa đổi tài khoản nhận sẽ làm chữ ký mất hiệu lực lập tức.',
    pts: 100,
  },
  {
    id: 'level_eavesdropping',
    num: 7,
    title: 'Nghe Trộm Đường Truyền',
    attackType: 'NONE',
    difficulty: 'TRUNG BÌNH',
    color: 'text-neon-amber',
    emoji: '🟡',
    diffColor: 'text-neon-amber',
    scenario: 'Hacker cài thiết bị nghe lén (sniffer) trên đường truyền dữ liệu không mã hóa để thu thập thông tin tài khoản và số dư nhạy cảm của khách hàng.',
    cards: 'AES-GCM',
    hint: 'Kích hoạt mã hóa có xác thực "AES-GCM" để ẩn toàn bộ nội dung dữ liệu payload thành dạng bản mã (ciphertext) không thể đọc được.',
    pts: 100,
  },
  {
    id: 'level_replay_alteration',
    num: 8,
    title: 'Replay Có Sửa Đổi',
    attackType: 'REPLAY',
    difficulty: 'KHÓ',
    color: 'text-neon-pink',
    emoji: '🔴',
    diffColor: 'text-neon-pink',
    scenario: 'Hacker chặn một gói tin cũ, thay đổi số tiền giao dịch lớn hơn rồi phát lại gói tin giả mạo này lên ngân hàng — kết hợp Replay + Tampering.',
    cards: 'Chữ ký số, Replay Cache (Có thể thêm Nonce)',
    hint: 'Cần kết hợp "Chữ ký số" để phát hiện sự thay đổi nội dung số tiền và "Replay Cache" để phát hiện hành vi gửi lại gói tin cũ.',
    pts: 100,
  },
  {
    id: 'level_revoked_key',
    num: 9,
    title: 'Sử Dụng Khóa Bị Thu Hồi',
    attackType: 'INVALID_SIGNATURE',
    difficulty: 'KHÓ',
    color: 'text-neon-pink',
    emoji: '🔴',
    diffColor: 'text-neon-pink',
    scenario: 'Hacker chiếm đoạt và sử dụng một khóa riêng tư cũ của Alice đã bị thu hồi trong quá khứ (status = REVOKED) để ký số giao dịch hợp lệ giả.',
    cards: 'Key Fingerprint, Chữ ký số',
    hint: '"Key Fingerprint" kiểm tra đối chiếu dấu vân tay khóa công khai với Registry ngân hàng để phát hiện trạng thái khóa đã bị hủy bỏ hiệu lực.',
    pts: 130,
  },
  {
    id: 'level_metadata_tampering',
    num: 10,
    title: 'Sửa Đổi Metadata',
    attackType: 'AMOUNT_TAMPERING',
    difficulty: 'TRUNG BÌNH',
    color: 'text-neon-amber',
    emoji: '🟡',
    diffColor: 'text-neon-amber',
    scenario: 'Hacker thay đổi các trường metadata nhạy cảm như session_id, message_id, sequence_no hòng làm sai lệch logic kiểm định trùng lặp.',
    cards: 'HMAC-SHA256',
    hint: 'Trang bị "HMAC-SHA256" (Mã xác thực thông điệp khóa bí mật) để bảo vệ tính toàn vẹn của phần tiêu đề và siêu dữ liệu thông điệp.',
    pts: 110,
  },
  {
    id: 'level_delay_attack',
    num: 11,
    title: 'Tấn Công Trễ Gói Tin',
    attackType: 'EXPIRED_TRANSACTION',
    difficulty: 'TRUNG BÌNH',
    color: 'text-neon-amber',
    emoji: '🟡',
    diffColor: 'text-neon-amber',
    scenario: 'Hacker chặn giữ gói tin giao dịch trong thời gian dài rồi mới truyền tiếp lên ngân hàng sau khi thị trường có biến động tỷ giá có lợi.',
    cards: 'Timestamp/TTL',
    hint: 'Kích hoạt "Timestamp/TTL" để đối chiếu thời gian tạo giao dịch với thời gian máy chủ, từ chối gói tin có độ lệch vượt quá 5 phút.',
    pts: 100,
  },
  {
    id: 'level_bank_spoofing',
    num: 12,
    title: 'Giả Lập Máy Chủ Ngân Hàng',
    attackType: 'INVALID_SIGNATURE',
    difficulty: 'KHÓ',
    color: 'text-neon-pink',
    emoji: '🔴',
    diffColor: 'text-neon-pink',
    scenario: 'Hacker thiết lập cổng thanh toán giả mạo (Fake Bank) để lừa Alice kết nối và tự ký số các phản hồi bằng khóa ngân hàng giả lập.',
    cards: 'Chữ ký số, Key Fingerprint',
    hint: 'Trang bị cặp đôi "Chữ ký số" xác thực chữ ký phản hồi và "Key Fingerprint" đối chiếu vân tay khóa để đảm bảo đó là máy chủ chính thống.',
    pts: 140,
  },
  {
    id: 'level_cryptanalysis',
    num: 13,
    title: 'Giải Mã AES Yếu',
    attackType: 'WRONG_KEY',
    difficulty: 'KHÓ',
    color: 'text-neon-pink',
    emoji: '🔴',
    diffColor: 'text-neon-pink',
    scenario: 'Hacker phân tích mật mã khai thác khóa đối xứng yếu, trùng lặp hoặc hết hạn đang được sử dụng để giải mã gói tin AEAD.',
    cards: 'AES-GCM, Key Fingerprint (Có thể thêm Nonce)',
    hint: '"AES-GCM" thực hiện giải mã AEAD kèm xác thực tag, và "Key Fingerprint" đối chiếu dấu vân tay khóa đối xứng trong Registry để phát hiện khóa yếu.',
    pts: 150,
  },
  {
    id: 'level_nonce_collision',
    num: 14,
    title: 'Tấn Công Vét Cạn Nonce',
    attackType: 'REPLAY',
    difficulty: 'KHÓ',
    color: 'text-neon-pink',
    emoji: '🔴',
    diffColor: 'text-neon-pink',
    scenario: 'Hacker liên tiếp gửi hàng loạt gói tin giao dịch có các giá trị Nonce trùng lặp nhằm vét cạn tài nguyên hệ thống kiểm soát chống phát lại.',
    cards: 'Nonce, Replay Cache',
    hint: 'Trang bị "Nonce" (số dùng một lần) và "Replay Cache" (ghi nhớ các Nonce đã xử lý) để nhận diện và từ chối các Nonce trùng lặp tức thì.',
    pts: 130,
  },
  {
    id: 'level_full_out_attack',
    num: 15,
    title: '⚡ TẤN CÔNG MẠNG TỔNG LỰC (BOSS)',
    attackType: 'AMOUNT_TAMPERING + REPLAY + INVALID_SIGNATURE',
    difficulty: 'ÁC MỘNG',
    color: 'text-[#ff6b35]',
    emoji: '💀',
    diffColor: 'text-[#ff6b35]',
    scenario: 'Trận chiến cuối cùng! Hacker Bot tung toàn bộ các phương thức tấn công: Vừa nghe trộm dữ liệu, vừa sửa tiền, ký số bằng khóa bị thu hồi, và liên tiếp phát lại giao dịch cũ.',
    cards: 'AES-GCM, Chữ ký số, Replay Cache, Secure Audit Log (Có thể thêm Nonce, Timestamp/TTL)',
    hint: '⚠️ BOSS FIGHT: Bạn chỉ được chọn tối đa 4 thẻ. Hãy chọn đúng 4 thẻ: "AES-GCM" (bảo mật), "Chữ ký số" (toàn vẹn/xác thực), "Replay Cache" (chống phát lại), và "Secure Audit Log" (truy vết pháp y). Sai một thẻ dư hoặc thiếu thẻ đều thất bại!',
    pts: 200,
  },
];
const CARD_DATA = [
  { name: 'Chữ ký số', icon: '✍️', color: 'text-neon-cyan', desc: 'RSA-PSS/ECDSA. Xác minh Alice đúng là người gửi và dữ liệu chưa bị sửa đổi. Phát hiện mọi Tampering và giả mạo danh tính.', useCase: 'Chống: AMOUNT_TAMPERING, INVALID_SIGNATURE, GIẢ MẠO DANH TÍNH' },
  { name: 'AES-GCM', icon: '🔐', color: 'text-neon-cyan', desc: 'Mã hóa đối xứng kết hợp xác thực AEAD (Authenticated Encryption with Associated Data). GCM Tag phát hiện bất kỳ thay đổi nào trong ciphertext.', useCase: 'Chống: NGHE TRỘM, WRONG_KEY, TAMPERING trên ciphertext' },
  { name: 'Nonce', icon: '🎲', color: 'text-neon-amber', desc: 'Số ngẫu nhiên dùng 1 lần (Number used Once). Mỗi giao dịch phải có Nonce khác nhau, giúp phát hiện gói tin đã xử lý trước đó.', useCase: 'Chống: REPLAY ATTACK, NONCE BRUTE-FORCE' },
  { name: 'Timestamp/TTL', icon: '⏰', color: 'text-neon-amber', desc: 'Kiểm tra thời gian tạo giao dịch. Giao dịch quá hạn (thường > 5 phút) sẽ bị từ chối, ngăn hacker giữ lại gói tin rồi phát lại sau.', useCase: 'Chống: DELAY ATTACK, EXPIRED_TRANSACTION, REPLAY cũ' },
  { name: 'Replay Cache', icon: '💾', color: 'text-neon-amber', desc: 'Bộ đệm ghi nhớ tất cả message_id đã xử lý. Gói tin trùng message_id sẽ bị từ chối ngay lập tức, dù nội dung hoàn toàn hợp lệ.', useCase: 'Chống: REPLAY ATTACK, NONCE COLLISION, GỬI LẠI TRÙNG' },
  { name: 'Key Fingerprint', icon: '🔑', color: 'text-neon-green', desc: 'Kiểm tra dấu vân tay (hash) của khóa công khai và trạng thái khóa (ACTIVE/REVOKED). Phát hiện khóa giả, khóa bị thu hồi hoặc key_id không tồn tại.', useCase: 'Chống: INVALID_SIGNATURE, REVOKED_KEY, WRONG_KEY' },
  { name: 'Secure Audit Log', icon: '📋', color: 'text-neon-green', desc: 'Nhật ký bất biến, chống giả mạo. Ghi lại mọi sự kiện bảo mật để phục vụ điều tra pháp y và phát hiện bất thường.', useCase: 'Hỗ trợ: Giao dịch hợp lệ, điều tra sau sự cố, compliance' },
];

export const GuidePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  const handleTabChange = (tab: Tab) => {
    SoundFX.playClick();
    setActiveTab(tab);
  };

  const toggleLevel = (id: string) => {
    SoundFX.playCard();
    setExpandedLevel(expandedLevel === id ? null : id);
  };

  return (
    <div className="flex flex-col gap-6 p-4 max-w-6xl mx-auto pb-16">

      {/* HUD Header */}
      <div className="hud-box">
        <h2 className="text-xl font-bold uppercase tracking-wider text-neon-cyan glitch-text">
          📖 TRUNG TÂM HUẤN LUYỆN OPERATOR
        </h2>
        <p className="text-xs text-muted mt-1 font-mono">
          [Tài liệu hướng dẫn tương tác] | Học cách vận hành hệ thống, vượt qua 15 màn chiến dịch an ninh mật mã và sử dụng các công cụ pháp y.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {[
          { id: 'OVERVIEW', label: '1. Hướng Dẫn Cơ Bản', icon: BookOpen },
          { id: 'LEVELS', label: '2. Hướng Dẫn 15 Màn Chơi', icon: Layers },
          { id: 'CARDS', label: '3. Giải Thích Thẻ Bài', icon: Key },
          { id: 'COMPONENTS', label: '4. Cách Đọc Giao Diện', icon: Cpu },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id as Tab)}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded font-mono text-[11px] uppercase tracking-wider transition-all duration-300 ${
              activeTab === t.id
                ? 'border-neon-cyan text-neon-cyan bg-[rgba(0,240,255,0.05)] font-bold'
                : 'border-transparent text-muted hover:text-[#e2f1ff]'
            }`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Overview ─────────────────────────────── */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <div className="md:col-span-2 flex flex-col gap-6">

            <div className="hud-box">
              <h3 className="text-sm font-bold text-neon-cyan uppercase border-b border-border/40 pb-1.5 mb-3">🎯 Mục Tiêu Trò Chơi</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bạn đóng vai <span className="text-neon-cyan font-bold">Operator An Ninh</span> bảo vệ hệ thống ngân hàng trực tuyến. <span className="text-neon-pink font-bold">Hacker (Attacker Bot)</span> đang cố gắng tấn công — giả mạo, sửa đổi hoặc phát lại các giao dịch chuyển tiền.
                Nhiệm vụ: <span className="text-neon-green font-bold">Phân tích loại tấn công → Chọn đúng thẻ bài phòng thủ → Kích hoạt hệ thống xác minh → Vượt qua toàn bộ 15 màn chiến dịch!</span>
              </p>
            </div>

            <div className="hud-box">
              <h3 className="text-sm font-bold text-neon-cyan uppercase border-b border-border/40 pb-1.5 mb-3">⚙️ 4 Bước Chơi Chuẩn</h3>
              <div className="flex flex-col gap-4 text-xs">
                {[
                  { step: 1, title: 'Đọc tình huống tấn công', desc: 'Mỗi màn có mô tả chi tiết về loại tấn công (Replay, Tampering, Wrong Key...). Đọc kỹ trước khi hành động!' },
                  { step: 2, title: 'Phân tích thẻ bài phòng thủ', desc: 'Xem danh sách thẻ bài có sẵn. Mỗi thẻ có mô tả chức năng — đọc để hiểu thẻ nào chống được loại tấn công đang diễn ra.' },
                  { step: 3, title: 'Chọn CHÍNH XÁC thẻ cần thiết', desc: '⚠️ QUAN TRỌNG: Phải chọn ĐỦ thẻ cần thiết và KHÔNG chọn thẻ sai. Thiếu hoặc thừa thẻ đều bị trừ điểm!' },
                  { step: 4, title: 'Kích hoạt xác minh & xem báo cáo', desc: 'Bấm "KÍCH HOẠT XÁC MINH". Hệ thống quét sẽ chạy — còi đỏ = thất bại, âm thành công = Neutralized. Bấm "Xem Báo Cáo" để nhận điểm và học giải thích học thuật.' },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full border border-neon-cyan text-neon-cyan flex items-center justify-center font-bold font-mono flex-shrink-0">{step}</div>
                    <div>
                      <span className="text-[#e2f1ff] font-bold block">{title}</span>
                      <span className="text-muted-foreground">{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hud-box border-neon-amber/30 bg-[rgba(255,200,0,0.02)]">
              <h3 className="text-sm font-bold text-neon-amber uppercase border-b border-neon-amber/20 pb-1.5 mb-3">⚠️ Quy Tắc Chọn Thẻ Bài (Quan Trọng!)</h3>
              <div className="flex flex-col gap-2 text-[11px] text-muted-foreground">
                <p>✅ <span className="text-neon-green font-bold">ĐÚNG</span>: Chọn đủ thẻ cần thiết theo kịch bản.</p>
                <p>❌ <span className="text-neon-pink font-bold">SAI</span>: Thiếu thẻ cần thiết → Hệ thống không phát hiện được tấn công.</p>
                <p>❌ <span className="text-neon-pink font-bold">SAI</span>: Chọn thẻ không liên quan đến kịch bản → Bị trừ điểm.</p>
                <p>💡 Mẹo: Đọc kỹ mô tả kịch bản, nhìn vào tab "Giải Thích Thẻ Bài" để biết từng thẻ chống loại tấn công gì.</p>
              </div>
            </div>

          </div>

          <div className="md:col-span-1 flex flex-col gap-6">
            <div className="hud-box border-neon-green/30 bg-[rgba(57,255,20,0.02)]">
              <h3 className="text-sm font-bold text-neon-green uppercase border-b border-neon-green/20 pb-1.5 mb-2 flex items-center gap-1.5">
                <Award size={16} /> Hệ Thống Danh Hiệu
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">Tích lũy điểm qua 15 màn để nâng Rank:</p>
              <div className="flex flex-col gap-2 font-mono text-[10px]">
                {[
                  { rank: 'Học Viên An Ninh', range: '0 – 200 pts', color: 'text-muted' },
                  { rank: 'Hộ Vệ Không Gian Mạng', range: '201 – 500 pts', color: 'text-neon-cyan' },
                  { rank: 'Chuyên Gia Mật Mã', range: '501 – 900 pts', color: 'text-neon-amber' },
                  { rank: 'Thám Tử Pháp Y', range: '901 – 1200 pts', color: 'text-neon-pink' },
                  { rank: '⚡ Bậc Thầy Pháp Y', range: '1201+ pts', color: 'text-neon-green font-bold' },
                ].map(r => (
                  <div key={r.rank} className={`flex justify-between border-b border-border/30 pb-1 ${r.color}`}>
                    <span>{r.rank}</span>
                    <span>{r.range}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hud-box border-neon-pink/30 bg-[rgba(255,0,100,0.02)]">
              <h3 className="text-sm font-bold text-neon-pink uppercase border-b border-neon-pink/20 pb-1.5 mb-2">💀 Loại Tấn Công</h3>
              <div className="flex flex-col gap-2 font-mono text-[10px] text-muted-foreground">
                <p><span className="text-neon-cyan">NONE</span> – Không tấn công, kiểm tra bảo mật cơ bản</p>
                <p><span className="text-neon-amber">AMOUNT_TAMPERING</span> – Sửa đổi nội dung gói tin</p>
                <p><span className="text-neon-amber">REPLAY</span> – Phát lại gói tin cũ</p>
                <p><span className="text-neon-pink">INVALID_SIGNATURE</span> – Chữ ký hoặc khóa giả</p>
                <p><span className="text-neon-pink">WRONG_KEY</span> – Sai khóa mã hóa</p>
                <p><span className="text-[#ff6b35] font-bold">EXPIRED_TRANSACTION</span> – Giao dịch quá hạn</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: All 15 Levels ────────────────────────── */}
      {activeTab === 'LEVELS' && (
        <div className="flex flex-col gap-3 animate-fade-in font-mono text-xs">
          <p className="text-muted-foreground text-[11px] pl-1">Click vào từng màn để xem chi tiết kịch bản và gợi ý thẻ bài cần chọn 👇</p>
          {LEVEL_DATA.map(lv => (
            <div
              key={lv.id}
              className={`hud-box border-border/40 cursor-pointer transition-all duration-300 ${expandedLevel === lv.id ? 'border-neon-cyan/40 bg-[rgba(0,240,255,0.03)]' : 'hover:border-border/80'}`}
              onClick={() => toggleLevel(lv.id)}
            >
              {/* Header row */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-base">{lv.emoji}</span>
                  <span className={`font-bold ${lv.color}`}>LEVEL {lv.num}: {lv.title.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold ${lv.diffColor} border border-current px-1.5 py-0.5 rounded`}>{lv.difficulty}</span>
                  <span className="text-[10px] text-neon-green">+{lv.pts} PTS</span>
                  <span className={`text-[10px] transition-transform duration-300 ${expandedLevel === lv.id ? 'rotate-90' : ''}`}>▶</span>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedLevel === lv.id && (
                <div className="mt-4 flex flex-col gap-3 border-t border-border/40 pt-3">
                  <div>
                    <span className="text-neon-pink font-bold">[TÌNH HUỐNG]</span>
                    <p className="text-muted-foreground text-[11px] leading-relaxed mt-1">{lv.scenario}</p>
                  </div>
                  <div className="bg-terminal p-2.5 rounded border border-neon-cyan/20">
                    <span className="text-neon-cyan font-bold">👉 THẺ BÀI CẦN CHỌN: </span>
                    <span className="text-white font-bold">{lv.cards}</span>
                  </div>
                  <div className="bg-[rgba(255,200,0,0.05)] border border-neon-amber/20 p-2 rounded text-[10px] text-neon-amber">
                    💡 <span className="font-bold">MẸO:</span> {lv.hint}
                  </div>
                  <div className="text-[10px] text-muted">
                    <span className="text-muted-foreground">Loại tấn công: </span>
                    <span className="text-neon-pink font-mono">{lv.attackType}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Tab 3: Card Explanations ─────────────────────── */}
      {activeTab === 'CARDS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          <div className="md:col-span-2 hud-box border-neon-cyan/20 bg-[rgba(0,240,255,0.02)]">
            <p className="text-[11px] text-muted-foreground font-mono">
              Hệ thống có <span className="text-neon-cyan font-bold">7 thẻ bài phòng thủ</span>. Mỗi thẻ phản ánh một công nghệ mật mã thực tế được dùng trong bảo mật ngân hàng hiện đại.
            </p>
          </div>
          {CARD_DATA.map(card => (
            <div key={card.name} className="hud-box flex flex-col gap-2">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <span className="text-lg">{card.icon}</span>
                <h3 className={`text-sm font-bold uppercase ${card.color}`}>{card.name}</h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{card.desc}</p>
              <div className="bg-terminal p-2 rounded border border-border/40 text-[10px] font-mono">
                <span className="text-neon-green">USE CASE: </span>
                <span className="text-muted-foreground">{card.useCase}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab 4: UI Components Explanation ─────────────── */}
      {activeTab === 'COMPONENTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in text-xs leading-relaxed text-[#e2f1ff]">

          <div className="hud-box flex flex-col gap-3">
            <h3 className="text-sm font-bold text-neon-cyan uppercase border-b border-border/40 pb-1">📡 Sơ Đồ Pipeline Mạng</h3>
            <p className="text-muted-foreground text-[11px]">Sơ đồ hoạt họa giúp bạn hình dung luồng dữ liệu:</p>
            <ul className="list-disc pl-4 flex flex-col gap-1.5 text-[11px] text-muted-foreground">
              <li><span className="text-[#e2f1ff] font-bold">Client Node</span>: Nơi Alice ký số và mã hóa giao dịch bằng khóa RSA + AES.</li>
              <li><span className="text-neon-pink font-bold">Attacker Bot (MITM)</span>: Kẻ trung gian nghe lén, có thể sửa tiền, phát lại hoặc chèn chữ ký giả tùy theo cấp độ.</li>
              <li><span className="text-neon-green font-bold">Bank Validator</span>: Lõi máy chủ ngân hàng, thực thi quét kiểm tra dựa trên các thẻ bài bạn trang bị.</li>
            </ul>
          </div>

          <div className="hud-box flex flex-col gap-3">
            <h3 className="text-sm font-bold text-neon-cyan uppercase border-b border-border/40 pb-1">💻 Hex Dump Bộ Nhớ</h3>
            <p className="text-muted-foreground text-[11px]">Trình diễn các byte nhị phân thô của gói dữ liệu:</p>
            <ul className="list-disc pl-4 flex flex-col gap-1.5 text-[11px] text-muted-foreground">
              <li><span className="text-[#e2f1ff] font-bold">Canonical JSON Payload</span>: Chuỗi JSON gốc được chuẩn hóa — nền tảng để ký số và băm.</li>
              <li><span className="text-[#e2f1ff] font-bold">Hex Memory Dump</span>: Bộ nhớ thô dạng Hex. Nếu gói tin bị hacker sửa, các byte bị thay đổi sẽ nhấp nháy neon đỏ (glitch).</li>
            </ul>
          </div>

          <div className="hud-box flex flex-col gap-3">
            <h3 className="text-sm font-bold text-neon-cyan uppercase border-b border-border/40 pb-1">🃏 Khu Vực Thẻ Bài</h3>
            <p className="text-muted-foreground text-[11px]">Giao diện chọn vũ khí phòng thủ:</p>
            <ul className="list-disc pl-4 flex flex-col gap-1.5 text-[11px] text-muted-foreground">
              <li><span className="text-neon-green font-bold">Viền xanh lá</span>: Thẻ đang được chọn.</li>
              <li><span className="text-neon-cyan font-bold">Viền cyan</span>: Thẻ hợp lệ với kịch bản (gợi ý đúng hướng).</li>
              <li><span className="text-neon-pink font-bold">Viền đỏ</span>: Thẻ không phù hợp — chọn sẽ bị trừ điểm!</li>
              <li>Tối đa chọn được <span className="text-white font-bold">4 thẻ</span> mỗi lượt.</li>
            </ul>
          </div>

          <div className="hud-box flex flex-col gap-3">
            <h3 className="text-sm font-bold text-neon-cyan uppercase border-b border-border/40 pb-1">📊 Báo Cáo Pháp Y</h3>
            <p className="text-muted-foreground text-[11px]">Sau khi kích hoạt xác minh, bạn sẽ thấy:</p>
            <ul className="list-disc pl-4 flex flex-col gap-1.5 text-[11px] text-muted-foreground">
              <li><span className="text-neon-green font-bold">✅ [PASS]</span>: Lớp kiểm tra vượt qua thành công.</li>
              <li><span className="text-neon-pink font-bold">❌ [FAIL]</span>: Lớp kiểm tra phát hiện tấn công — có giải thích chi tiết.</li>
              <li><span className="text-neon-amber font-bold">Điểm số</span>: Cộng điểm dựa trên số thẻ đúng, trừ điểm cho thẻ sai.</li>
              <li><span className="text-neon-cyan font-bold">Kết quả tổng</span>: ATTACK NEUTRALIZED (thành công) hoặc BREACH DETECTED (thất bại).</li>
            </ul>
          </div>

          <div className="hud-box md:col-span-2 flex flex-col gap-3 border-neon-green/20 bg-[rgba(57,255,20,0.02)]">
            <h3 className="text-sm font-bold text-neon-green uppercase border-b border-neon-green/20 pb-1">🎵 Âm Thanh & Nhạc Nền</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-muted-foreground">
              <div>
                <p className="text-[#e2f1ff] font-bold mb-1">Nhạc nền Cyberpunk Synthwave:</p>
                <p>Nhạc nền được tổng hợp trực tiếp bằng Web Audio API — không dùng file MP3. Đây là kỹ thuật "programmatic music synthesis" phong cách Cyberpunk với bass synth, pad ambient, arpeggios và drum machine.</p>
              </div>
              <div>
                <p className="text-[#e2f1ff] font-bold mb-1">Hiệu ứng âm thanh:</p>
                <ul className="list-disc pl-3 flex flex-col gap-1">
                  <li><span className="text-neon-cyan">Click</span>: Tiếng beep ngắn khi bấm nút.</li>
                  <li><span className="text-neon-amber">Chọn thẻ</span>: Tone tăng dần khi chọn thẻ bài.</li>
                  <li><span className="text-neon-pink">Báo động</span>: Còi hú 3 lần khi thất bại.</li>
                  <li><span className="text-neon-green">Thành công</span>: Hợp âm C-E-G-C khi Neutralized.</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
